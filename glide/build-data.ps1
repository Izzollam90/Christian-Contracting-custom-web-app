# Builds the Herkey Maintenance Glide data: one CSV per table in .\data, then a single .xlsx workbook.
# Re-run any time:  powershell -ExecutionPolicy Bypass -File .\glide\build-data.ps1
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$dataDir = Join-Path $root 'data'
New-Item -ItemType Directory -Force $dataDir | Out-Null
$T = [ordered]@{}
function Add-Table($name, $rows) { $T[$name] = $rows }
function Utc($s) { [datetimeoffset]::Parse($s, [Globalization.CultureInfo]::InvariantCulture).UtcDateTime.ToString('yyyy-MM-ddTHH:mm:ssZ') }

# ---------- lookup tables ----------
Add-Table 'Roles' @(
  [pscustomobject]@{Role='Customer';  IsCustomer=$true; IsCrew=$false;IsCrewLead=$false;IsFinance=$false;IsAdmin=$false;CanClaimJobs=$false;CanAssignJobs=$false;CanApproveExpenses=$false;CanInvoice=$false;CanSeeRawData=$false;Description='Submits requests; sees only their own jobs, estimates and invoices'}
  [pscustomobject]@{Role='Crew';      IsCustomer=$false;IsCrew=$true; IsCrewLead=$false;IsFinance=$false;IsAdmin=$false;CanClaimJobs=$true; CanAssignJobs=$false;CanApproveExpenses=$false;CanInvoice=$false;CanSeeRawData=$false;Description='Claims and works jobs; records time and expenses; drafts estimates'}
  [pscustomobject]@{Role='CrewLead';  IsCustomer=$false;IsCrew=$true; IsCrewLead=$true; IsFinance=$false;IsAdmin=$false;CanClaimJobs=$true; CanAssignJobs=$true; CanApproveExpenses=$true; CanInvoice=$false;CanSeeRawData=$false;Description='Assigns and schedules crew; approves expenses and flagged time'}
  [pscustomobject]@{Role='Finance';   IsCustomer=$false;IsCrew=$false;IsCrewLead=$false;IsFinance=$true; IsAdmin=$false;CanClaimJobs=$false;CanAssignJobs=$false;CanApproveExpenses=$true; CanInvoice=$true; CanSeeRawData=$false;Description='Invoices, approved spending, time and payroll reports'}
  [pscustomobject]@{Role='Admin';     IsCustomer=$false;IsCrew=$false;IsCrewLead=$true; IsFinance=$true; IsAdmin=$true; CanClaimJobs=$true; CanAssignJobs=$true; CanApproveExpenses=$true; CanInvoice=$true; CanSeeRawData=$true; Description='Everything, including users, roles and raw tables'}
)
Add-Table 'ServiceCategories' (@(
  'Plumbing|Leaks, drains, fixtures','Electrical|Lights, outlets, switches','HVAC|Heat, A/C, filters','Carpentry|Doors, trim, railings',
  'Appliance Repair|Washers, ranges, fridges','Painting|Interior and exterior','Exterior|Gutters, siding, decks','General Repair|Anything else'
) | ForEach-Object { $p=$_ -split '\|'; [pscustomobject]@{Category=$p[0];Description=$p[1];Active=$true} })
$statuses = @(
  @('Requested',1,$true,'We received your request','Blue'),@('Accepted',2,$true,'A crew member accepted','Purple'),@('Scheduled',3,$true,'Your visit is scheduled','Gold'),
  @('In Progress',4,$true,'Work is underway','Orange'),@('Completed',5,$false,'Job complete','Green'),@('On Hold',6,$true,'Paused, we will update you','Gray'),@('Canceled',7,$false,'Canceled','Red'))
Add-Table 'JobStatuses' ($statuses | ForEach-Object { [pscustomobject]@{Status=$_[0];StepOrder=$_[1];IsOpen=$_[2];CustomerLabel=$_[3];Color=$_[4]} })
Add-Table 'Priorities' @(
  [pscustomobject]@{Priority='Routine';SortOrder=3;CustomerHint='Within a week or two'}
  [pscustomobject]@{Priority='Soon';SortOrder=2;CustomerHint='In the next few days'}
  [pscustomobject]@{Priority='Emergency';SortOrder=1;CustomerHint='Water, power or safety'}
)
Add-Table 'TimeSlots' @(
  [pscustomobject]@{Slot='8-10 am';StartTime='08:00';EndTime='10:00';SortOrder=1}
  [pscustomobject]@{Slot='10 am-12 pm';StartTime='10:00';EndTime='12:00';SortOrder=2}
  [pscustomobject]@{Slot='1-3 pm';StartTime='13:00';EndTime='15:00';SortOrder=3}
  [pscustomobject]@{Slot='3-5 pm';StartTime='15:00';EndTime='17:00';SortOrder=4}
)
Add-Table 'DocStatuses' (@(
  'Estimate|Draft|1','Estimate|Sent|2','Estimate|Accepted|3','Estimate|Rejected|4',
  'Invoice|Draft|1','Invoice|Unpaid|2','Invoice|Paid|3','Invoice|Void|4',
  'Expense|Submitted|1','Expense|Approved|2','Expense|Rejected|3',
  'TimeEntry|Open|1','TimeEntry|Approved|2','TimeEntry|Needs Review|3','TimeEntry|Rejected|4'
) | ForEach-Object { $p=$_ -split '\|'; [pscustomobject]@{AppliesTo=$p[0];Status=$p[1];SortOrder=[int]$p[2]} })
Add-Table 'Settings' @(
  [pscustomobject]@{Key='CompanyName';Value='Herkey Maintenance';Notes='Christian Contracting is a possible legal/brand name'}
  [pscustomobject]@{Key='Timezone';Value='America/New_York';Notes='Reports use this for "this month"'}
  [pscustomobject]@{Key='GeofenceMeters';Value='200';Notes='Clock-in distance check (supporting evidence only)'}
  [pscustomobject]@{Key='OvertimeAfterHours';Value='40';Notes='Weekly; paid at 1.5x. Not final.'}
  [pscustomobject]@{Key='InvoiceDueDays';Value='30';Notes='Payment terms. Not final.'}
)

# ---------- people ----------
$cust = @(
  @('C-01','Dana Whitfield','dana.whitfield@example.com','(717) 555-0142','410 Maple Ridge Rd, Apt 204','Lancaster','PA','17601',40.0412,-76.3021),
  @('C-02','Robert Ames','robert.ames@example.com','(717) 555-0157','18 Cedar St, Unit B','Lancaster','PA','17602',40.0480,-76.2952),
  @('C-03','Greenfield Property Group','greenfield.pm@example.com','(717) 555-0188','22 Orchard Ln','Lancaster','PA','17603',40.0365,-76.2890),
  @('C-04','Linda Moss','linda.moss@example.com','(717) 555-0163','77 King St','Lancaster','PA','17602',40.0390,-76.3100))
Add-Table 'Customers' ($cust | ForEach-Object { [pscustomobject]@{CustomerID=$_[0];Name=$_[1];Email=$_[2];Phone=$_[3];Street=$_[4];City=$_[5];State=$_[6];Zip=$_[7];Latitude=$_[8];Longitude=$_[9];CreatedAt=(Utc '2026-09-01T14:00:00Z')} })
$staff = @(
  @('U-01','Marcus Lee','marcus.lee@example.com','(717) 555-0110','Crew',2800),
  @('U-02','Tasha Green','tasha.green@example.com','(717) 555-0111','Crew',3100),
  @('U-03','Eli Ortiz','eli.ortiz@example.com','(717) 555-0112','Crew',2600),
  @('U-04','Renee Carter','renee.carter@example.com','(717) 555-0120','CrewLead',3400),
  @('U-05','Pat Kim','pat.kim@example.com','(717) 555-0130','Finance',''),
  @('U-06','Owner (replace with your email)','owner@example.com','(717) 555-0140','Admin',''))
Add-Table 'Staff' ($staff | ForEach-Object { [pscustomobject]@{UserID=$_[0];Name=$_[1];Email=$_[2];Phone=$_[3];Role=$_[4];HourlyRateCents=$_[5];Active=$true;InvitedBy='owner@example.com';Photo=''} })
$email = @{}; $staff | ForEach-Object { $email[$_[0]] = $_[2] }; $cust | ForEach-Object { $email[$_[0]] = $_[2] }
$sname = @{}; $staff | ForEach-Object { $sname[$_[0]] = $_[1] }
$addr = @{}; $cust | ForEach-Object { $addr[$_[0]] = "$($_[4]), $($_[5]), $($_[6]) $($_[7])" }

# ---------- jobs ----------
# id, title, category, priority, status, customer, crew, preferredDate, slot, created, accepted, completed, description
$jobs = @(
  @('J-1041','Kitchen sink leaking under cabinet','Plumbing','Soon','In Progress','C-01','U-01','2026-11-06','10 am-12 pm','2026-11-04T14:00:00Z','2026-11-04T16:00:00Z','','Slow drip from the trap. A bucket is under it for now.'),
  @('J-1042','Hallway light fixture out','Electrical','Routine','Scheduled','C-01','U-02','2026-11-09','8-10 am','2026-11-05T13:00:00Z','2026-11-05T17:00:00Z','','Fixture by the stairwell flickers then goes dark.'),
  @('J-1043','Gutter cleanout, both sides','Exterior','Routine','Requested','C-02','','2026-11-12','1-3 pm','2026-11-06T12:00:00Z','','','Seasonal cleanout before winter.'),
  @('J-1044','Furnace filter and inspection','HVAC','Soon','Requested','C-02','','2026-11-10','8-10 am','2026-11-06T15:00:00Z','','','Annual service. Two dogs in the home.'),
  @('J-1045','Unit turnover: paint and patch','Painting','Routine','Accepted','C-03','U-03','','','2026-11-05T12:00:00Z','2026-11-05T16:00:00Z','','2BR turnover, move-in in 10 days.'),
  @('J-1046','Repaint living room and trim','Painting','Routine','Requested','C-01','','2026-11-13','10 am-12 pm','2026-11-06T13:00:00Z','','','Two walls plus baseboards. Match the existing warm white.'),
  @('J-1047','Dishwasher not draining','Appliance Repair','Emergency','Requested','C-04','','2026-11-07','8-10 am','2026-11-06T17:20:00Z','','','Standing water after every cycle.'),
  @('J-1039','Back door sticks','Carpentry','Routine','Scheduled','C-04','U-01','2026-11-10','1-3 pm','2026-11-02T15:00:00Z','2026-11-02T18:00:00Z','','Swelling at the latch side.'),
  @('J-1040','Porch railing re-anchor','Carpentry','Emergency','On Hold','C-02','U-03','2026-11-11','10 am-12 pm','2026-10-31T14:00:00Z','2026-10-31T15:00:00Z','','Waiting on brackets (backordered).'),
  @('J-1038','Patch and paint drywall','Painting','Routine','Completed','C-01','U-03','2026-10-28','1-3 pm','2026-10-25T14:00:00Z','2026-10-26T13:00:00Z','2026-10-29T20:00:00Z','Two holes from move-out.'),
  @('J-1035','Storm door rehang','Carpentry','Routine','Completed','C-04','U-01','2026-11-03','8-10 am','2026-10-30T14:00:00Z','2026-10-30T16:00:00Z','2026-11-03T15:30:00Z','Door drags on the threshold.'),
  @('J-1033','Bath fan replacement','Electrical','Routine','Completed','C-03','U-02','2026-11-02','10 am-12 pm','2026-10-27T14:00:00Z','2026-10-27T18:00:00Z','2026-11-02T16:45:00Z','Fan is loud and barely pulls air.'))
Add-Table 'Jobs' ($jobs | ForEach-Object { [pscustomobject]@{
  JobID=$_[0];Title=$_[1];Description=$_[12];Category=$_[2];Priority=$_[3];Status=$_[4];CustomerID=$_[5];CustomerEmail=$email[$_[5]];ServiceAddress=$addr[$_[5]]
  CrewUserID=$_[6];CrewEmail=$(if($_[6]){$email[$_[6]]}else{''});CrewName=$(if($_[6]){$sname[$_[6]]}else{''});PreferredDate=$_[7];TimeSlot=$_[8]
  CreatedAt=(Utc $_[9]);AcceptedAt=$(if($_[10]){Utc $_[10]}else{''});CompletedAt=$(if($_[11]){Utc $_[11]}else{''});PhotoURL='';CustomerNotes='' } })
$jobCust = @{}; $jobs | ForEach-Object { $jobCust[$_[0]] = $_[5] }

# ---------- estimates & invoices ----------
$est = @(
  @('EST-2053','J-1046','Sent','U-04','2026-11-06T15:00:00Z','2026-11-06T15:05:00Z',''),
  @('EST-2052','J-1045','Draft','U-03','2026-11-05T20:00:00Z','',''),
  @('EST-2049','J-1041','Accepted','U-01','2026-11-04T16:30:00Z','2026-11-04T16:35:00Z','2026-11-04T18:10:00Z'),
  @('EST-2047','J-1033','Accepted','U-02','2026-10-28T14:00:00Z','2026-10-28T14:05:00Z','2026-10-28T19:00:00Z'))
Add-Table 'Estimates' ($est | ForEach-Object { [pscustomobject]@{EstimateID=$_[0];JobID=$_[1];CustomerEmail=$email[$jobCust[$_[1]]];Status=$_[2];CreatedByEmail=$email[$_[3]];CreatedAt=(Utc $_[4]);SentAt=$(if($_[5]){Utc $_[5]}else{''});RespondedAt=$(if($_[6]){Utc $_[6]}else{''});CustomerComment=''} })
$estEmail=@{}; $est | ForEach-Object { $estEmail[$_[0]]=$email[$jobCust[$_[1]]] }
$el = @(
  @('EST-2053','Wall prep and patching',2,6500),@('EST-2053','Paint, 2 coats, 2 walls',1,38000),@('EST-2053','Baseboard trim, semi-gloss',1,12500),@('EST-2053','Paint and materials',1,9400),
  @('EST-2052','Turnover paint, 2BR (labor hours)',16,4500),@('EST-2052','Paint and supplies',1,21000),
  @('EST-2049','Plumbing labor (hours)',1.5,8500),@('EST-2049','P-trap kit',1,1800),
  @('EST-2047','Electrical labor (hours)',2,9000),@('EST-2047','Bath fan, 80 CFM',1,11900))
$i=0; Add-Table 'EstimateLines' ($el | ForEach-Object { $i++; [pscustomobject]@{LineID=('EL-{0:D3}' -f $i);EstimateID=$_[0];CustomerEmail=$estEmail[$_[0]];Description=$_[1];Quantity=$_[2];UnitPriceCents=$_[3];LineTotalCents=[math]::Round($_[2]*$_[3])} })
$inv = @(
  @('INV-3018','J-1038','','Unpaid','2026-10-29T21:00:00Z','2026-11-28','',''),
  @('INV-3016','J-1035','','Paid','2026-11-03T18:00:00Z','2026-12-03','2026-11-05T15:00:00Z','Check'),
  @('INV-3014','J-1033','EST-2047','Unpaid','2026-11-02T19:00:00Z','2026-12-02','',''))
Add-Table 'Invoices' ($inv | ForEach-Object { [pscustomobject]@{InvoiceID=$_[0];JobID=$_[1];EstimateID=$_[2];CustomerEmail=$email[$jobCust[$_[1]]];Status=$_[3];IssuedAt=(Utc $_[4]);DueDate=$_[5];PaidAt=$(if($_[6]){Utc $_[6]}else{''});PaymentMethod=$_[7]} })
$invEmail=@{}; $inv | ForEach-Object { $invEmail[$_[0]]=$email[$jobCust[$_[1]]] }
$il = @(@('INV-3018','Drywall repair labor (hours)',4,6000),@('INV-3018','Compound, primer, paint',1,4600),@('INV-3016','Storm door rehang',1,14500),@('INV-3014','Electrical labor (hours)',2,9000),@('INV-3014','Bath fan, 80 CFM',1,11900))
$i=0; Add-Table 'InvoiceLines' ($il | ForEach-Object { $i++; [pscustomobject]@{LineID=('IL-{0:D3}' -f $i);InvoiceID=$_[0];CustomerEmail=$invEmail[$_[0]];Description=$_[1];Quantity=$_[2];UnitPriceCents=$_[3];LineTotalCents=[math]::Round($_[2]*$_[3])} })

# ---------- expenses ----------
$ex = @(
  @('U-01','','Materials','Ace Supply',18000,'2026-11-06','Approved','U-04','Drain parts restock'),@('U-03','','Fuel','Sheetz',9500,'2026-11-05','Approved','U-04',''),
  @('U-02','','Tools','Home Depot',24000,'2026-11-02','Approved','U-05','Cordless driver'),@('U-01','','Fuel','Sheetz',6200,'2026-10-29','Approved','U-04',''),
  @('U-04','','Equipment rental','Sunbelt Rentals',14500,'2026-10-31','Approved','U-05','Ladder rental'),@('U-04','J-1040','Subcontractor','Keystone Welding',65000,'2026-10-23','Approved','U-05','Railing brackets fabrication'),
  @('U-02','J-1033','Materials','Ace Supply',8900,'2026-10-28','Approved','U-04','Fan and duct'),@('U-03','J-1038','Materials','Home Depot',4600,'2026-10-28','Approved','U-04','Compound, primer'),
  @('U-01','','Fuel','Sheetz',7100,'2026-10-14','Approved','U-04',''),@('U-04','','Equipment rental','Sunbelt Rentals',22000,'2026-10-10','Approved','U-05',''),
  @('U-01','J-1041','Materials','Ace Supply',1800,'2026-11-06','Submitted','','P-trap kit'),@('U-03','','Fuel','Sheetz',4275,'2026-11-05','Submitted','','Truck 2 fill-up'))
$i=499; Add-Table 'Expenses' ($ex | ForEach-Object { $i++; [pscustomobject]@{ExpenseID=('X-'+$i);SubmittedByEmail=$email[$_[0]];JobID=$_[1];Category=$_[2];Vendor=$_[3];AmountCents=$_[4];ExpenseDate=$_[5];Status=$_[6];ReviewedByEmail=$(if($_[7]){$email[$_[7]]}else{''});Note=$_[8];ReceiptURL=''} })

# ---------- time entries ----------
$te=@(); $n=0
$days = '2026-10-29','2026-10-30','2026-11-02','2026-11-03','2026-11-04','2026-11-05'
$crewSites = @{ 'U-01'=@('C-01','C-04'); 'U-02'=@('C-03','C-01'); 'U-03'=@('C-03','C-02'); 'U-04'=@('C-02','C-04') }
$k=0
foreach ($u in 'U-01','U-02','U-03','U-04') { foreach ($d in $days) { $n++; $k++
  $start=[datetimeoffset]::Parse("$($d)T12:30:00Z").UtcDateTime; $start=$start.AddMinutes(($k*7)%40); $len=7.5+(($k%3)*0.5)
  $site=$crewSites[$u][$k%2]
  $te += [pscustomobject]@{EntryID=('T-{0:D3}' -f $n);UserEmail=$email[$u];JobID='';CustomerID=$site;ClockIn=$start.ToString('yyyy-MM-ddTHH:mm:ssZ');ClockOut=$start.AddHours($len).ToString('yyyy-MM-ddTHH:mm:ssZ');DistanceMeters=(30+($k*37)%140);LocationCheck='Within geofence';Review='Approved';Note=''} } }
$n++; $te += [pscustomobject]@{EntryID=('T-{0:D3}' -f $n);UserEmail=$email['U-03'];JobID='J-1045';CustomerID='C-03';ClockIn='2026-11-05T12:36:00Z';ClockOut='2026-11-05T21:00:00Z';DistanceMeters=260;LocationCheck='Outside geofence';Review='Needs Review';Note='Gate locked, clocked in from the street.'}
$n++; $te += [pscustomobject]@{EntryID=('T-{0:D3}' -f $n);UserEmail=$email['U-01'];JobID='J-1041';CustomerID='C-01';ClockIn='2026-11-06T14:52:00Z';ClockOut='';DistanceMeters=38;LocationCheck='Within geofence';Review='Open';Note=''}
Add-Table 'TimeEntries' $te

# ---------- activity log ----------
$log = @(
  @('J-1041','2026-11-04T14:00:00Z','C-01','Request submitted'),@('J-1041','2026-11-04T16:00:00Z','U-01','Claimed job'),@('J-1041','2026-11-04T18:10:00Z','C-01','Accepted estimate EST-2049'),@('J-1041','2026-11-06T15:05:00Z','U-01','On site. Trap washer worn; replacing.'),
  @('J-1042','2026-11-05T13:00:00Z','C-01','Request submitted'),@('J-1042','2026-11-05T17:00:00Z','U-04','Assigned to Tasha Green; scheduled Nov 9, 8-10 am'),
  @('J-1043','2026-11-06T12:00:00Z','C-02','Request submitted'),@('J-1044','2026-11-06T15:00:00Z','C-02','Request submitted'),
  @('J-1045','2026-11-05T12:00:00Z','U-06','Job created by office'),@('J-1045','2026-11-05T16:00:00Z','U-03','Claimed job'),
  @('J-1046','2026-11-06T13:00:00Z','C-01','Request submitted'),@('J-1046','2026-11-06T15:05:00Z','U-04','Sent estimate EST-2053'),
  @('J-1047','2026-11-06T17:20:00Z','C-04','Emergency request submitted'),
  @('J-1040','2026-11-03T14:00:00Z','U-03','On hold: brackets backordered'),
  @('J-1038','2026-10-29T20:00:00Z','U-03','Marked complete'),@('J-1035','2026-11-03T15:30:00Z','U-01','Marked complete'),@('J-1033','2026-11-02T16:45:00Z','U-02','Marked complete'))
$i=0; Add-Table 'ActivityLog' ($log | ForEach-Object { $i++; [pscustomobject]@{LogID=('A-{0:D3}' -f $i);JobID=$_[0];CustomerEmail=$email[$jobCust[$_[0]]];At=(Utc $_[1]);ByEmail=$email[$_[2]];Action=$_[3];VisibleToCustomer=$true} })

# ---------- write CSVs ----------
foreach ($name in $T.Keys) { $T[$name] | Export-Csv -Path (Join-Path $dataDir "$name.csv") -NoTypeInformation -Encoding UTF8 }
"CSVs written: $($T.Keys.Count)"

# ---------- build workbook with Excel ----------
$xlsx = Join-Path $root 'Herkey-Maintenance-Glide-Data.xlsx'
if (Test-Path $xlsx) { Remove-Item $xlsx -Force }
$xl = New-Object -ComObject Excel.Application; $xl.Visible=$false; $xl.DisplayAlerts=$false
try {
  $wb = $xl.Workbooks.Add()
  while ($wb.Worksheets.Count -lt $T.Keys.Count) { [void]$wb.Worksheets.Add([Type]::Missing, $wb.Worksheets.Item($wb.Worksheets.Count)) }
  $idx=1
  foreach ($name in $T.Keys) {
    $ws = $wb.Worksheets.Item($idx); $ws.Name = $name
    $rows = @($T[$name]); $cols = @($rows[0].PSObject.Properties.Name)
    $arr = New-Object 'object[,]' ($rows.Count+1), $cols.Count
    for ($c=0;$c -lt $cols.Count;$c++){ $arr[0,$c]=$cols[$c] }
    for ($r=0;$r -lt $rows.Count;$r++){ for ($c=0;$c -lt $cols.Count;$c++){ $v=$rows[$r].($cols[$c]); if($v -is [bool]){ $arr[($r+1),$c]=$v } elseif("$v" -match '^-?\d+(\.\d+)?$' -and "$v" -notmatch '^0\d'){ $arr[($r+1),$c]=[double]$v } else { $arr[($r+1),$c]="$v" } } }
    $rng = $ws.Range($ws.Cells.Item(1,1), $ws.Cells.Item($rows.Count+1, $cols.Count))
    $ws.Range($ws.Cells.Item(1,1), $ws.Cells.Item($rows.Count+1, $cols.Count)).NumberFormat='@'
    foreach($c in 0..($cols.Count-1)){ if ($cols[$c] -match 'Cents|Order|Quantity|Meters|Latitude|Longitude|StepOrder|SortOrder') { $ws.Range($ws.Cells.Item(2,$c+1),$ws.Cells.Item($rows.Count+1,$c+1)).NumberFormat='General' } }
    $rng.Value2 = $arr
    $ws.Rows.Item(1).Font.Bold = $true
    [void]$ws.Columns.AutoFit()
    $idx++
  }
  $wb.SaveAs($xlsx, 51); $wb.Close($false)
  "Workbook: $xlsx"
} finally { $xl.Quit(); [void][Runtime.InteropServices.Marshal]::ReleaseComObject($xl) }
