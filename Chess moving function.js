function selectPiece() {
  var scriptProperties = PropertiesService.getScriptProperties();
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("ChessBoard");

  // Get the currently selected range after the user has selected it
  var selectedPieceCell = sheet.getActiveRange();

  // Ensure that only a single cell is selected
  if (selectedPieceCell.getNumRows() > 1 || selectedPieceCell.getNumColumns() > 1) {
    SpreadsheetApp.getUi().alert("Please select a single cell.");
    return;
  }

  // Get the piece from the selected cell
  var piece = selectedPieceCell.getValue();

  // Check if the selected cell contains a piece
  if (piece === "") {
    SpreadsheetApp.getUi().alert("No piece at the selected cell: " + selectedPieceCell.getA1Notation());
    scriptProperties.deleteProperty("selectedPieceCell"); // Clear the selection
    return;
  }

  // Store the selected piece cell's address in Script Properties
  scriptProperties.setProperty("selectedPieceCell", selectedPieceCell.getA1Notation());

  // Inform the user that a piece has been selected
  SpreadsheetApp.getUi().alert("Piece " + piece + " selected at " + selectedPieceCell.getA1Notation());
}

function moveSelectedPiece() {
  var scriptProperties = PropertiesService.getScriptProperties();
  initializeTurn();

  var selectedPieceAddress = scriptProperties.getProperty("selectedPieceCell");
  var turn = scriptProperties.getProperty("turn");

  if (!selectedPieceAddress) {
    SpreadsheetApp.getUi().alert("Please select a piece first.");
    return;
  }

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("ChessBoard");
  var selectedPieceCell = sheet.getRange(selectedPieceAddress);
  var piece = selectedPieceCell.getValue();

  if (!checkTurnAndUpdateDisplay(piece)) {
    return; // If it's not the correct turn, exit the function
  }

  var targetCell = sheet.getActiveRange();
  if (targetCell.getNumRows() > 1 || targetCell.getNumColumns() > 1) {
    SpreadsheetApp.getUi().alert("Please select a single cell.");
    return;
  }

  var fromRow = selectedPieceCell.getRow() - 1;
  var fromCol = selectedPieceCell.getColumn() - 1;
  var toRow = targetCell.getRow() - 1;
  var toCol = targetCell.getColumn() - 1;

  if (!isLegalMove(piece, fromRow, fromCol, toRow, toCol)) {
    SpreadsheetApp.getUi().alert("Illegal move for " + piece + ".");
    return;
  }

  var targetCellValue = targetCell.getValue();
  if (targetCellValue !== "" && 
      ((turn === "white" && isWhitePiece(targetCellValue)) || 
       (turn === "black" && isBlackPiece(targetCellValue)))) {
    SpreadsheetApp.getUi().alert("The target cell is occupied by your own piece. Please choose another cell.");
    return;
  }

  // Capture piece handling
  if (targetCellValue !== "" && (isWhitePiece(targetCellValue) || isBlackPiece(targetCellValue))) {
    updateCapturedPieces(targetCellValue);
  }

  targetCell.setValue(piece);
  selectedPieceCell.setValue("");

  // Check for pawn promotion
  if (piece === "♙" && toRow === 0) { // White pawn reaches the top row
    var promotionPiece = promptForPromotion('white');
    if (promotionPiece) {
      targetCell.setValue(promotionPiece);
    } else {
      // Revert move if no valid promotion piece is provided
      selectedPieceCell.setValue(piece);
      targetCell.setValue(targetCellValue);
      SpreadsheetApp.getUi().alert("Promotion cancelled.");
      return;
    }
  } else if (piece === "♟" && toRow === 7) { // Black pawn reaches the bottom row
    var promotionPiece = promptForPromotion('black');
    if (promotionPiece) {
      targetCell.setValue(promotionPiece);
    } else {
      // Revert move if no valid promotion piece is provided
      selectedPieceCell.setValue(piece);
      targetCell.setValue(targetCellValue);
      SpreadsheetApp.getUi().alert("Promotion cancelled.");
      return;
    }
  }

  // Check if the move leaves the king in check
  if (isKingInCheck(turn, sheet)) {
    // Revert the move
    selectedPieceCell.setValue(piece);
    targetCell.setValue(targetCellValue); // Restore original target cell content
    SpreadsheetApp.getUi().alert("This move leaves your king in check. Please choose another move.");
    return;
  }

  // Ensure the piece is visible in the target cell
  var targetCellBackground = targetCell.getBackground();
  if (targetCellBackground === "#000000" || targetCellBackground.toLowerCase() === "black") {
    targetCell.setFontColor("white");
  } else {
    targetCell.setFontColor("black");
  }

  // Center the piece in the target cell
  targetCell.setHorizontalAlignment("center");
  targetCell.setVerticalAlignment("middle");

  // Clear the selection after moving the piece
  scriptProperties.deleteProperty("selectedPieceCell");

  // Switch the turn
  scriptProperties.setProperty("turn", turn === "white" ? "black" : "white");

  // Inform the user that the move was successful
  SpreadsheetApp.getUi().alert("Piece moved to " + targetCell.getA1Notation());
}


