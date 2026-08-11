# =====================================================================
#  FDI - VSL  ·  Dashboard de VENDAS (Video Sales Letter)
#  data engine. Baixa 2 planilhas Google (CSV export):
#    - Queries Meta Ads FDI (gasto/impr/cliques/LPV/video 3s/video 75%/
#      checkouts/purchases/reach/conversion value por dia x anuncio)
#    - Vendas (planilha multi-produto) -> filtra o FUNIL VSL pela
#      utm_campaign "FDI-VSL | ..." (o produto "Formula dos Investimentos"
#      e vendido em varios funis; a campanha isola o VSL).
#  Cruza a venda com o gasto de midia p/ ROAS, CPA/CAC, funil de video
#  e otimizacao. Imposto (+13,85%) em TODO gasto do Meta. Somente leitura.
#  ASCII-only de proposito (PS5.1 le .ps1 como ANSI; acentos so no front).
# =====================================================================
param([ValidateSet('all')][string]$Mode='all')
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$BR = [Globalization.CultureInfo]::GetCultureInfo('pt-BR')
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$dataDir = Join-Path $root 'data'
New-Item -ItemType Directory -Force -Path $dataDir | Out-Null

# ---- Fontes (somente leitura) --------------------------------------
$META_ID   = '1BkrUzkcjX-xJ5C5qapPseBLRtev7FwpLovfaDKFNsZE'; $META_GID   = '0'   # Queries | Meta Ads FDI
$VENDAS_ID = '1BJ-T_Aj5oeMge667xWtX_SfGCSiibcFo7l0yLWTt_BQ'; $VENDAS_GID = '0'   # aba vendas (multi-produto)
$TAX = 1.1385                 # imposto Meta (+13,85%) aplicado em TODO gasto
$CAMP_FRAG = 'fdi-vsl'        # funil VSL = utm_campaign contem "fdi-vsl"
$SENT = 'SEM_RASTREIO'

function Get-Sheet($id,$gid,$out){
  $url = "https://docs.google.com/spreadsheets/d/$id/gviz/tq?tqx=out:csv&gid=$gid"
  [Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12
  (New-Object System.Net.WebClient).DownloadFile($url,$out)
  if((Get-Item $out).Length -lt 20){ throw "Download muito pequeno: $out" }
}
# parser CSV manual (fallback p/ Linux/pwsh onde TextFieldParser pode nao existir).
# trata campos entre aspas, aspas escapadas (""), virgulas e quebras de linha dentro do campo.
function Parse-CsvText($text){
  $rows=New-Object System.Collections.Generic.List[object]
  $field=New-Object System.Text.StringBuilder
  $cur=New-Object System.Collections.Generic.List[string]
  $inQ=$false; $i=0; $n=$text.Length
  while($i -lt $n){
    $ch=$text[$i]
    if($inQ){
      if($ch -eq '"'){ if(($i+1) -lt $n -and $text[$i+1] -eq '"'){ [void]$field.Append('"'); $i++ } else { $inQ=$false } }
      else { [void]$field.Append($ch) }
    } else {
      if($ch -eq '"'){ $inQ=$true }
      elseif($ch -eq ','){ [void]$cur.Add($field.ToString()); [void]$field.Clear() }
      elseif($ch -eq "`n"){ [void]$cur.Add($field.ToString()); [void]$field.Clear(); $rows.Add($cur.ToArray()); $cur=New-Object System.Collections.Generic.List[string] }
      elseif($ch -eq "`r"){ }
      else { [void]$field.Append($ch) }
    }
    $i++
  }
  if($field.Length -gt 0 -or $cur.Count -gt 0){ [void]$cur.Add($field.ToString()); $rows.Add($cur.ToArray()) }
  return $rows
}
function Read-Csv($path){
  try {
    Add-Type -AssemblyName Microsoft.VisualBasic -ErrorAction Stop
    $rows = New-Object System.Collections.Generic.List[object]
    $p = New-Object Microsoft.VisualBasic.FileIO.TextFieldParser($path,[System.Text.Encoding]::UTF8)
    $p.TextFieldType='Delimited'; $p.SetDelimiters(','); $p.HasFieldsEnclosedInQuotes=$true
    while(-not $p.EndOfData){ try { $rows.Add($p.ReadFields()) } catch { } }
    $p.Close(); return $rows
  } catch {
    $text=[IO.File]::ReadAllText($path,[System.Text.Encoding]::UTF8)
    return Parse-CsvText $text
  }
}
function Norm($s){ if($null -eq $s){return ''}; return ($s -replace [char]0x200b,'').Trim() }
function MoneyBR($s){ $s=Norm $s; if($s -eq ''){return 0.0}
  $s = $s -replace '[R$\s]',''
  if($s -match ','){ $s = ($s -replace '\.','') -replace ',','.' }
  if($s -notmatch '^-?\d'){ return 0.0 }; return [double]$s }
function ToInt($s){ $s=Norm $s; if($s -eq ''){return 0}; $v=($s -replace '\.','' -replace ',','.'); if($v -notmatch '^-?\d'){return 0}; return [int][double]$v }
function Deaccent($s){ if($null -eq $s){return ''}; $s=$s.Normalize([Text.NormalizationForm]::FormD); $sb=New-Object Text.StringBuilder
  foreach($c in $s.ToCharArray()){ if([Globalization.CharUnicodeInfo]::GetUnicodeCategory($c) -ne [Globalization.UnicodeCategory]::NonSpacingMark){ [void]$sb.Append($c) } }
  # colapsa espacos multiplos p/ casar nomes com espacamento diferente entre venda e query
  # (ex.: venda "| 279" vs query "|  279"). Nomes de exibicao mantem o original.
  return (($sb.ToString().ToLower().Trim()) -replace '\s+',' ') }
function HdrLike($hdr,$frag){ for($i=0;$i -lt $hdr.Count;$i++){ if((Deaccent $hdr[$i]) -like $frag){ return $i } }; return -1 }
# vendas Data: "10/08/2026, 14:49:18" (dd/mm/yyyy) OU "2026-07-25" OU "25-06-2026" -> yyyy-mm-dd
function SaleDate($s){ $s=Norm $s
  if($s -match '^(\d{4})-(\d{2})-(\d{2})'){ return ('{0}-{1}-{2}' -f $Matches[1],$Matches[2],$Matches[3]) }
  if($s -match '^(\d{1,2})/(\d{1,2})/(\d{4})'){ return ('{0}-{1:d2}-{2:d2}' -f $Matches[3],[int]$Matches[2],[int]$Matches[1]) }
  if($s -match '^(\d{1,2})-(\d{1,2})-(\d{4})'){ return ('{0}-{1:d2}-{2:d2}' -f $Matches[3],[int]$Matches[2],[int]$Matches[1]) }
  return '' }
# queries Day ja vem yyyy-mm-dd (aceita dd/mm/yyyy por seguranca)
function QDay($s){ $s=Norm $s; if($s -match '^\d{4}-\d{2}-\d{2}'){ return $s.Substring(0,10) }
  if($s -match '^(\d{1,2})/(\d{1,2})/(\d{4})'){ return ('{0}-{1:d2}-{2:d2}' -f $Matches[3],[int]$Matches[2],[int]$Matches[1]) }; return '' }
# utm com macro nao-resolvida ({{...}}) ou erro de planilha (#REF!/#N/A) = invalido
function CleanUtm($s){ $s=Norm $s; if($s -eq '' -or $s -like '*{{*' -or $s -like '#*'){ return '' }; return $s }
function Cell($r,$i){ if($i -ge 0 -and $r.Count -gt $i){ return CleanUtm $r[$i] }; return '' }

# =====================================================================
#  1) VENDAS: filtra o funil VSL (utm_campaign contem FDI-VSL)
# =====================================================================
Write-Host "Baixando planilhas..."
$vCsv=Join-Path $dataDir 'vendas.csv'; $mCsv=Join-Path $dataDir 'meta.csv'
Get-Sheet $VENDAS_ID $VENDAS_GID $vCsv
Get-Sheet $META_ID   $META_GID   $mCsv

$v = Read-Csv $vCsv; $vh=$v[0]; $vd=$v[1..($v.Count-1)]
$V_DATE=HdrLike $vh 'data'; $V_PROD=HdrLike $vh 'produto'; $V_FAT=HdrLike $vh 'faturamento'
$V_SRC=HdrLike $vh '*utm*source*'; $V_MED=HdrLike $vh '*utm*medium*'
$V_CONT=HdrLike $vh '*utm*content*'; $V_TERM=HdrLike $vh '*utm*term*'; $V_CAMP=HdrLike $vh '*utm*campaign*'
foreach($pair in @(@('Data',$V_DATE),@('Faturamento',$V_FAT),@('utm_campaign',$V_CAMP))){ if($pair[1] -lt 0){ throw ("Vendas: coluna nao encontrada: "+$pair[0]) } }

$vslSales = New-Object System.Collections.Generic.List[object]   # todas as vendas do funil VSL
$allDaily=@{}                                                    # por dia x origem (aba Vendas)
$prodCount=@{}
function _ad($d){ if(-not $allDaily.ContainsKey($d)){ $allDaily[$d]=[pscustomobject]@{date=$d;fbSales=0;fbRev=0.0;orgSales=0;orgRev=0.0} }; return $allDaily[$d] }

foreach($r in $vd){
  if($r.Count -le $V_FAT){ continue }
  $camp = Cell $r $V_CAMP
  if((Deaccent $camp) -notlike ("*"+$CAMP_FRAG+"*")){ continue }   # so o funil VSL
  $d = SaleDate $r[$V_DATE]; if($d -eq ''){ continue }
  $rev = MoneyBR $r[$V_FAT]
  $prod = Norm $r[$V_PROD]; if($prod -ne ''){ if(-not $prodCount.ContainsKey($prod)){$prodCount[$prod]=0}; $prodCount[$prod]++ }
  $src = Deaccent (Cell $r $V_SRC)
  $isFb = ($src -eq 'facebook-ads' -or $src -eq '' -or $src -like 'fb*' -or $src -like 'facebook*')
  $o=_ad $d
  if($isFb){ $o.fbSales++; $o.fbRev+=$rev } else { $o.orgSales++; $o.orgRev+=$rev }
  $vslSales.Add([pscustomobject]@{ date=$d; rev=$rev
    camp=$camp; adset=(Cell $r $V_TERM); ad=(Cell $r $V_CONT) })
}
$allDailyArr=@($allDaily.Values | Sort-Object date)
Write-Host ("Vendas VSL: total={0}" -f $vslSales.Count)

# =====================================================================
#  2) QUERIES META: daily + grain (gasto c/ imposto + funil de video)
# =====================================================================
$m = Read-Csv $mCsv; $mh=$m[0]; $md=$m[1..($m.Count-1)]
$Q_DAY=HdrLike $mh 'day'; if($Q_DAY -lt 0){ $Q_DAY=HdrLike $mh 'date' }
$Q_CAMP=HdrLike $mh 'campaign name'; $Q_SET=HdrLike $mh 'ad set name'; $Q_AD=HdrLike $mh 'ad name'
$Q_SPEND=HdrLike $mh '*spent*'; if($Q_SPEND -lt 0){ $Q_SPEND=HdrLike $mh '*spend*' }
$Q_IMP=HdrLike $mh 'impressions'; $Q_CLK=HdrLike $mh '*link clicks*'; if($Q_CLK -lt 0){ $Q_CLK=HdrLike $mh 'clicks' }
$Q_LPV=HdrLike $mh '*landing page view*'; $Q_CHK=HdrLike $mh '*checkout*'
$Q_V3=HdrLike $mh '*3-second*'; if($Q_V3 -lt 0){ $Q_V3=HdrLike $mh '*3 second*' }
$Q_V75=HdrLike $mh '*75*'
$Q_PUR=HdrLike $mh 'purchases'; $Q_PVAL=HdrLike $mh '*conversion value*'
$Q_REACH=HdrLike $mh 'reach'
foreach($pair in @(@('Day',$Q_DAY),@('Campaign',$Q_CAMP),@('Ad Set',$Q_SET),@('Ad',$Q_AD),@('Spend',$Q_SPEND),@('Impressions',$Q_IMP))){ if($pair[1] -lt 0){ throw ("Query: coluna nao encontrada: "+$pair[0]) } }

# mapas de nome p/ atribuicao (deaccent -> nome real) + pares/triplas validas (co-localizacao)
$campDe=@{}; $setDe=@{}; $adDe=@{}; $qPair=@{}; $qTriple=@{}; $adToTriple=@{}; $setToPair=@{}
$qDaysSet=@{}
foreach($r in $md){ if($r.Count -le $Q_AD){continue}
  $cn=Norm $r[$Q_CAMP]; $sn=Norm $r[$Q_SET]; $an=Norm $r[$Q_AD]
  if($cn -ne ''){ $k=Deaccent $cn; if(-not $campDe.ContainsKey($k)){$campDe[$k]=$cn} }
  if($sn -ne ''){ $k=Deaccent $sn; if(-not $setDe.ContainsKey($k)){$setDe[$k]=$sn} }
  if($an -ne ''){ $k=Deaccent $an; if(-not $adDe.ContainsKey($k)){$adDe[$k]=$an} }
  if($cn -ne '' -and $sn -ne ''){ $qPair["$cn`u$sn"]=$true; if($an -ne ''){ $qTriple["$cn`u$sn`u$an"]=$true } }
  if($an -ne '' -and $sn -ne '' -and $cn -ne ''){ $k=Deaccent $an; if(-not $adToTriple.ContainsKey($k)){ $adToTriple[$k]=@{camp=$cn;set=$sn;ad=$an} } }
  if($sn -ne '' -and $cn -ne ''){ $k=Deaccent $sn; if(-not $setToPair.ContainsKey($k)){ $setToPair[$k]=@{camp=$cn;set=$sn} } }
}

$daily=@{}; $grain=@{}
function _gd($d){ if(-not $daily.ContainsKey($d)){ $daily[$d]=[pscustomobject]@{date=$d;spendRaw=0.0;spend=0.0;impr=0;reach=0;clicks=0;lpv=0;v3=0;v75=0;checkout=0;mpur=0;mrev=0.0;sales=0;rev=0.0} }; return $daily[$d] }
function _gg($k,$d,$c,$s,$a){ if(-not $grain.ContainsKey($k)){ $grain[$k]=[pscustomobject]@{date=$d;campaign=$c;adset=$s;ad=$a;spendRaw=0.0;spend=0.0;impr=0;reach=0;clicks=0;lpv=0;v3=0;v75=0;checkout=0;mpur=0;mrev=0.0;sales=0;rev=0.0} }; return $grain[$k] }

foreach($r in $md){ if($r.Count -le $Q_AD){continue}
  $d=QDay $r[$Q_DAY]; if($d -notmatch '^\d{4}-\d{2}-\d{2}$'){continue}
  $qDaysSet[$d]=$true
  $spRaw=MoneyBR $r[$Q_SPEND]; $sp=$spRaw*$TAX
  $im=ToInt $r[$Q_IMP]
  $rc= if($Q_REACH -ge 0){ ToInt $r[$Q_REACH] } else { 0 }
  $ck= if($Q_CLK -ge 0){ ToInt $r[$Q_CLK] } else { 0 }
  $lp= if($Q_LPV -ge 0){ ToInt $r[$Q_LPV] } else { 0 }
  $v3= if($Q_V3 -ge 0){ ToInt $r[$Q_V3] } else { 0 }
  $v75= if($Q_V75 -ge 0){ ToInt $r[$Q_V75] } else { 0 }
  $chk= if($Q_CHK -ge 0){ ToInt $r[$Q_CHK] } else { 0 }
  $mp= if($Q_PUR -ge 0){ ToInt $r[$Q_PUR] } else { 0 }
  $mv= if($Q_PVAL -ge 0){ MoneyBR $r[$Q_PVAL] } else { 0.0 }
  $cn=Norm $r[$Q_CAMP]; $sn=Norm $r[$Q_SET]; $an=Norm $r[$Q_AD]
  $o=_gd $d; $o.spendRaw+=$spRaw;$o.spend+=$sp;$o.impr+=$im;$o.reach+=$rc;$o.clicks+=$ck;$o.lpv+=$lp;$o.v3+=$v3;$o.v75+=$v75;$o.checkout+=$chk;$o.mpur+=$mp;$o.mrev+=$mv
  $g=_gg "$d`u$cn`u$sn`u$an" $d $cn $sn $an; $g.spendRaw+=$spRaw;$g.spend+=$sp;$g.impr+=$im;$g.reach+=$rc;$g.clicks+=$ck;$g.lpv+=$lp;$g.v3+=$v3;$g.v75+=$v75;$g.checkout+=$chk;$g.mpur+=$mp;$g.mrev+=$mv
}
$qDays=@($qDaysSet.Keys | Sort-Object)
$qMin= if($qDays.Count){ $qDays[0] } else { '' }
$qMax= if($qDays.Count){ $qDays[-1] } else { '' }

# =====================================================================
#  3) CRUZAMENTO: vendas VSL dentro da janela das queries -> funil + grain
# =====================================================================
function MatchName($val,$deMap){ $vd=Deaccent $val; if($vd -eq ''){return ''}; if($deMap.ContainsKey($vd)){return $deMap[$vd]}; return '' }
$attr=0; $inWin=0
foreach($s in $vslSales){
  if($qMin -eq '' -or $s.date -lt $qMin -or $s.date -gt $qMax){ continue }   # cruza SO a janela das queries
  $inWin++
  $o=_gd $s.date; $o.sales++; $o.rev+=$s.rev
  $cName=MatchName $s.camp $campDe
  if($cName -ne ''){
    $sName=MatchName $s.adset $setDe
    $aName=MatchName $s.ad $adDe
    if($sName -eq '' -or -not $qPair.ContainsKey("$cName`u$sName")){ $sName=$SENT; $aName=$SENT }
    elseif($aName -eq '' -or -not $qTriple.ContainsKey("$cName`u$sName`u$aName")){ $aName=$SENT }
    $attr++
  } else {
    $adk=Deaccent $s.ad; $setk=Deaccent $s.adset
    if($adk -ne '' -and $adToTriple.ContainsKey($adk)){ $t=$adToTriple[$adk]; $cName=$t.camp; $sName=$t.set; $aName=$t.ad; $attr++ }
    elseif($setk -ne '' -and $setToPair.ContainsKey($setk)){ $t=$setToPair[$setk]; $cName=$t.camp; $sName=$t.set; $aName=$SENT; $attr++ }
    else { $cName=$SENT; $sName=$SENT; $aName=$SENT }
  }
  $g=_gg "$($s.date)`u$cName`u$sName`u$aName" $s.date $cName $sName $aName; $g.sales++; $g.rev+=$s.rev
}

$dailyArr=@($daily.Values | Sort-Object date)
$grainArr=@($grain.Values | Where-Object { $_.spend -gt 0 -or $_.sales -gt 0 })
function _sum($arr,$p){ $x=($arr|Measure-Object $p -Sum).Sum; if($null -eq $x){return 0}; return $x }
$tot=[pscustomobject]@{
  spendRaw=(_sum $dailyArr 'spendRaw'); spend=(_sum $dailyArr 'spend'); impr=(_sum $dailyArr 'impr'); reach=(_sum $dailyArr 'reach'); clicks=(_sum $dailyArr 'clicks')
  lpv=(_sum $dailyArr 'lpv'); v3=(_sum $dailyArr 'v3'); v75=(_sum $dailyArr 'v75'); checkout=(_sum $dailyArr 'checkout')
  mpur=(_sum $dailyArr 'mpur'); mrev=(_sum $dailyArr 'mrev'); sales=(_sum $dailyArr 'sales'); rev=(_sum $dailyArr 'rev'); salesAttr=$attr }

# intern de nomes p/ enxugar o grain
$names=New-Object System.Collections.Generic.List[string]; $nameIdx=@{}
function _ni($nm){ if(-not $nameIdx.ContainsKey($nm)){ $nameIdx[$nm]=$names.Count; $names.Add($nm) }; return $nameIdx[$nm] }
$gOut=@()
foreach($g in $grainArr){
  $gOut += [pscustomobject]@{ d=$g.date; c=(_ni $g.campaign); s=(_ni $g.adset); a=(_ni $g.ad)
    sp=[math]::Round($g.spend,2); spr=[math]::Round($g.spendRaw,2); im=[int]$g.impr; rh=[int]$g.reach; ck=[int]$g.clicks; lp=[int]$g.lpv
    v3=[int]$g.v3; v75=[int]$g.v75; chk=[int]$g.checkout; mp=[int]$g.mpur; mv=[math]::Round($g.mrev,2); vn=[int]$g.sales; rv=[math]::Round($g.rev,2) }
}
$dOut=@()
foreach($o in $dailyArr){
  $dOut += [pscustomobject]@{ date=$o.date; spend=[math]::Round($o.spend,2); spendRaw=[math]::Round($o.spendRaw,2); impr=[int]$o.impr; reach=[int]$o.reach; clicks=[int]$o.clicks; lpv=[int]$o.lpv
    v3=[int]$o.v3; v75=[int]$o.v75; checkout=[int]$o.checkout; mpur=[int]$o.mpur; mrev=[math]::Round($o.mrev,2); sales=[int]$o.sales; rev=[math]::Round($o.rev,2) }
}

# =====================================================================
#  4) VENDAS (funil VSL completo) p/ a aba Vendas
# =====================================================================
$salesDaily=@()
foreach($o in $allDailyArr){
  $salesDaily += [pscustomobject]@{ date=$o.date; fbS=[int]$o.fbSales; fbR=[math]::Round($o.fbRev,2); orgS=[int]$o.orgSales; orgR=[math]::Round($o.orgRev,2) }
}
# ranking por campanha e por anuncio (atribuido por utm) - todas as vendas VSL
$byCampAgg=@{}; $byAdAgg=@{}
foreach($s in $vslSales){
  $ck= if($s.camp -ne ''){ $s.camp } else { $SENT }
  if(-not $byCampAgg.ContainsKey($ck)){ $byCampAgg[$ck]=[pscustomobject]@{name=$ck;sales=0;rev=0.0} }
  $byCampAgg[$ck].sales++; $byCampAgg[$ck].rev+=$s.rev
  $ak= if($s.ad -ne ''){ $s.ad } else { $SENT }
  if(-not $byAdAgg.ContainsKey($ak)){ $byAdAgg[$ak]=[pscustomobject]@{name=$ak;sales=0;rev=0.0} }
  $byAdAgg[$ak].sales++; $byAdAgg[$ak].rev+=$s.rev
}
$byCamp=@(); foreach($x in ($byCampAgg.Values | Sort-Object -Property @{e='sales';Descending=$true})){ $byCamp += [pscustomobject]@{ n=$x.name; s=[int]$x.sales; r=[math]::Round($x.rev,2) } }
$byAd=@();   foreach($x in ($byAdAgg.Values   | Sort-Object -Property @{e='sales';Descending=$true})){ $byAd   += [pscustomobject]@{ n=$x.name; s=[int]$x.sales; r=[math]::Round($x.rev,2) } }

$vTotFbS=($allDailyArr|Measure-Object fbSales -Sum).Sum;  if($null -eq $vTotFbS){$vTotFbS=0}
$vTotFbR=($allDailyArr|Measure-Object fbRev -Sum).Sum;    if($null -eq $vTotFbR){$vTotFbR=0}
$vTotOrgS=($allDailyArr|Measure-Object orgSales -Sum).Sum; if($null -eq $vTotOrgS){$vTotOrgS=0}
$vTotOrgR=($allDailyArr|Measure-Object orgRev -Sum).Sum;   if($null -eq $vTotOrgR){$vTotOrgR=0}
$sMin= if($allDailyArr.Count){ $allDailyArr[0].date } else { '' }
$sMax= if($allDailyArr.Count){ $allDailyArr[-1].date } else { '' }
# produto dominante do funil
$prodTop=''; $prodMax=-1; foreach($k in $prodCount.Keys){ if($prodCount[$k] -gt $prodMax){ $prodMax=$prodCount[$k]; $prodTop=$k } }

$vendas=[pscustomobject]@{
  daily=@($salesDaily); byCamp=@($byCamp); byAd=@($byAd)
  dateMin=$sMin; dateMax=$sMax; product=$prodTop
  totals=[pscustomobject]@{ fbSales=[int]$vTotFbS; fbRev=[math]::Round($vTotFbR,2); orgSales=[int]$vTotOrgS; orgRev=[math]::Round($vTotOrgR,2) }
}

$meta=[pscustomobject]@{
  dateMin=$qMin; dateMax=$qMax; salesInWindow=$inWin
  totals=$tot; names=@($names); daily=@($dOut); grain=@($gOut)
}

# =====================================================================
#  5) Emite data.js (window.VSL)
# =====================================================================
$nowIso=(Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
try { $nowBR=[System.TimeZoneInfo]::ConvertTimeBySystemTimeZoneId([DateTime]::UtcNow,'E. South America Standard Time').ToString('dd/MM/yyyy HH:mm') }
catch { try { $nowBR=[System.TimeZoneInfo]::ConvertTimeBySystemTimeZoneId([DateTime]::UtcNow,'America/Sao_Paulo').ToString('dd/MM/yyyy HH:mm') } catch { $nowBR=[DateTime]::UtcNow.AddHours(-3).ToString('dd/MM/yyyy HH:mm') } }
$utf8=[System.Text.UTF8Encoding]::new($false)
$payload=[pscustomobject]@{
  generatedAt=$nowIso; generatedAtBR=$nowBR; taxMultiplier=$TAX; product='FDI - VSL'
  meta=$meta; vendas=$vendas
}
$json=$payload | ConvertTo-Json -Depth 12 -Compress
[IO.File]::WriteAllText((Join-Path $root 'data.js'), ("window.VSL="+$json+";"), $utf8)

Write-Host ("OK  META (janela {0} -> {1})  dias={2} grain={3} vendas-janela={4} attrib={5}  gasto+imp=R$ {6}  fat=R$ {7}  ROAS={8}" -f `
  $qMin,$qMax,$meta.daily.Count,$meta.grain.Count,$tot.sales,$tot.salesAttr,($tot.spend.ToString('N2',$BR)),($tot.rev.ToString('N2',$BR)),(([double](& { if($tot.spend -gt 0){$tot.rev/$tot.spend}else{0} })).ToString('N2',$BR)))
Write-Host ("OK  META funil: impr={0} 3s={1} 75%={2} cliques={3} lpv={4} chk={5} | pixel: compras={6} valor=R$ {7}" -f `
  $tot.impr,$tot.v3,$tot.v75,$tot.clicks,$tot.lpv,$tot.checkout,$tot.mpur,([double]$tot.mrev).ToString('N2',$BR))
Write-Host ("OK  VENDAS VSL ({0} -> {1})  FB={2} / R$ {3}   outros={4} / R$ {5}   produto={6}" -f `
  $sMin,$sMax,$vTotFbS,([double]$vTotFbR).ToString('N2',$BR),$vTotOrgS,([double]$vTotOrgR).ToString('N2',$BR),$prodTop)
