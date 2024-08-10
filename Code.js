function formatChessBoard() {
  // Open the spreadsheet by ID
  var sheet = SpreadsheetApp.openById("1jX2M50bN4Op5x9nP_izZ3wQqA1L3RwPXV0xXgYhdbVI");

  // Get the sheet named "ChessBoard"
  var chessSheet = sheet.getSheetByName("ChessBoard");

  var currentTurnCell = sheet.getRange("I1");

  // Define the range for the 8x8 chessboard
  var chessBoardRange = chessSheet.getRange("A1:H8");

  // Set the row height and column width to make the cells square and larger
  chessSheet.setRowHeights(1, 8, 80); // Set row height for rows 1 to 8 to 80 pixels
  chessSheet.setColumnWidths(1, 8, 80); // Set column width for columns A to H to 80 pixels

  // Loop through the range and apply alternating colors, centering the text
  for (var row = 1; row <= 8; row++) {
    for (var col = 1; col <= 8; col++) {
      var cell = chessBoardRange.getCell(row, col);
      // Check if the sum of row and column is even
      if ((row + col) % 2 == 0) {
        cell.setBackground("white");
        cell.setFontColor("black"); // Ensure text is visible on light squares
      } else {
        cell.setBackground("black");
        cell.setFontColor("white"); // Ensure text is visible on dark squares
      }
      // Center the text (chess piece) in the cell
      cell.setHorizontalAlignment("center");
      cell.setVerticalAlignment("middle");
      cell.setFontSize(24); // Increase the font size for better visibility
    }
  }

  // Add chess pieces using Unicode symbols
  var chessPieces = [
    ["♜", "♞", "♝", "♛", "♚", "♝", "♞", "♜"],  // Black pieces (top row)
    ["♟", "♟", "♟", "♟", "♟", "♟", "♟", "♟"],  // Black pawns
    ["", "", "", "", "", "", "", ""],           // Empty rows
    ["", "", "", "", "", "", "", ""],           
    ["", "", "", "", "", "", "", ""],           
    ["", "", "", "", "", "", "", ""],           
    ["♙", "♙", "♙", "♙", "♙", "♙", "♙", "♙"],  // White pawns
    ["♖", "♘", "♗", "♕", "♔", "♗", "♘", "♖"]   // White pieces (bottom row)
  ];

  // Place the pieces on the board
  for (var row = 1; row <= 8; row++) {
    for (var col = 1; col <= 8; col++) {
      chessBoardRange.getCell(row, col).setValue(chessPieces[row-1][col-1]);
    }
  }

  // Set the turn to white
  var scriptProperties = PropertiesService.getScriptProperties();
  scriptProperties.setProperty("turn", "white");

  // Update the current turn display
  currentTurnCell.setValue("Current Turn: White");
}
