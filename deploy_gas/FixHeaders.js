
function fixSheetHeaders() {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName('EmailCampaigns');
  if (sh) {
    // Force update Header Row (Row 1)
    // A-L: CampaignID, Timestamp, ... Folder_Image, Header_HTML, Footer_HTML
    sh.getRange('A1:L1').setValues([[
      'CampaignID', 
      'Timestamp', 
      'Subject', 
      'FilterType', 
      'TotalRecipients', 
      'SuccessCount', 
      'FailedCount', 
      'OpenCount', 
      'Email_Open', 
      'Folder_Image', 
      'Header_HTML', 
      'Footer_HTML'
    ]]);
    console.log('✅ Headers updated!');
  }
}
