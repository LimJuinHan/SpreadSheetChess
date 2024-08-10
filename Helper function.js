function isWhitePiece(piece) {
  return ["♙", "♖", "♘", "♗", "♕", "♔"].includes(piece);
}

function isBlackPiece(piece) {
  return ["♟", "♜", "♞", "♝", "♛", "♚"].includes(piece);
}

function checkTurnAndUpdateDisplay(piece) {
  var scriptProperties = PropertiesService.getScriptProperties();
  var turn = scriptProperties.getProperty("turn");

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("ChessBoard");
  var currentTurnCell = sheet.getRange("I1");

  // Set the current turn text in cell I1
  currentTurnCell.setValue("Current Turn: " + (turn.charAt(0).toUpperCase() + turn.slice(1)));

  // Determine if the piece belongs to the current player
  var isCurrentPlayerPiece = (turn === "white" && isWhitePiece(piece)) || 
                             (turn === "black" && isBlackPiece(piece));

  if (piece && isCurrentPlayerPiece) {
    return true; // Valid turn
  } else {
    SpreadsheetApp.getUi().alert("It's not your turn.");
    return false; // Invalid turn
  }
}

function initializeTurn() {
  var scriptProperties = PropertiesService.getScriptProperties();
  if (!scriptProperties.getProperty("turn")) {
    scriptProperties.setProperty("turn", "white");
  }
}

function isSingleCellSelected(targetCell) {
  return !(targetCell.getNumRows() > 1 || targetCell.getNumColumns() > 1);
}

function getMoveInfo(selectedPieceCell, targetCell) {
  return {
    fromRow: selectedPieceCell.getRow() - 1, // Convert to 0-indexed row
    fromCol: selectedPieceCell.getColumn() - 1, // Convert to 0-indexed column
    toRow: targetCell.getRow() - 1,
    toCol: targetCell.getColumn() - 1
  };
}

function isValidTargetCell(targetCell, piece, turn) {
  var targetCellValue = targetCell.getValue();
  if (targetCellValue !== "" && 
      ((turn === "white" && isWhitePiece(targetCellValue)) || 
       (turn === "black" && isBlackPiece(targetCellValue)))) {
    SpreadsheetApp.getUi().alert("The target cell is occupied by your own piece. Please choose another cell.");
    return false;
  }
  return true;
}

function performMove(sheet, selectedPieceCell, targetCell, piece, moveInfo, turn) {
  var scriptProperties = PropertiesService.getScriptProperties();
  var enPassantCapture = detectEnPassant(piece, moveInfo, turn);

  var targetCellValue = targetCell.getValue();
  targetCell.setValue(piece);
  selectedPieceCell.setValue("");

  if (enPassantCapture) {
    removeCapturedPawn(sheet, moveInfo.toRow, moveInfo.toCol, turn);
  }

  if (isKingInCheck(turn, sheet)) {
    revertMove(selectedPieceCell, targetCell, piece, targetCellValue, enPassantCapture, sheet, moveInfo.toRow, moveInfo.toCol, turn);
    SpreadsheetApp.getUi().alert("This move leaves your king in check. Please choose another move.");
    return;
  }

  finalizeMove(targetCell, piece);
  scriptProperties.deleteProperty("selectedPieceCell");
  scriptProperties.setProperty("turn", turn === "white" ? "black" : "white");
  checkTurnAndUpdateDisplay(null);
  SpreadsheetApp.getUi().alert("Piece moved to " + targetCell.getA1Notation());
}


function removeCapturedPawn(sheet, toRow, toCol, turn) {
  var capturedPawnRow = turn === "white" ? toRow + 1 : toRow - 1;
  var capturedPawnCell = sheet.getRange(capturedPawnRow + 1, toCol + 1); // Convert back to 1-indexed
  capturedPawnCell.setValue("");
}

function revertMove(selectedPieceCell, targetCell, piece, targetCellValue, enPassantCapture, sheet, toRow, toCol, turn) {
  selectedPieceCell.setValue(piece);
  targetCell.setValue(targetCellValue); // Restore original target cell content
  if (enPassantCapture) {
    removeCapturedPawn(sheet, toRow, toCol, turn);
  }
}

function finalizeMove(targetCell, piece) {
  var targetCellBackground = targetCell.getBackground();
  if (targetCellBackground === "#000000" || targetCellBackground.toLowerCase() === "black") {
    targetCell.setFontColor("white");
  } else {
    targetCell.setFontColor("black");
  }
  targetCell.setHorizontalAlignment("center");
  targetCell.setVerticalAlignment("middle");
}

function performCastling(sheet, moveInfo, turn) {
  var scriptProperties = PropertiesService.getScriptProperties();
  var fromRow = moveInfo.fromRow;
  var toCol = moveInfo.toCol;
  var rookCol = (toCol > moveInfo.fromCol) ? 7 : 0;
  var newRookCol = (toCol > moveInfo.fromCol) ? toCol - 1 : toCol + 1;

  var kingCell = sheet.getRange(fromRow + 1, moveInfo.fromCol + 1);
  var rookCell = sheet.getRange(fromRow + 1, rookCol + 1);
  var newKingCell = sheet.getRange(fromRow + 1, toCol + 1);
  var newRookCell = sheet.getRange(fromRow + 1, newRookCol + 1);

  newKingCell.setValue(kingCell.getValue());
  newRookCell.setValue(rookCell.getValue());
  kingCell.setValue("");
  rookCell.setValue("");

  // Update cell formatting
  finalizeMove(newKingCell, newKingCell.getValue());
  finalizeMove(newRookCell, newRookCell.getValue());

  // Clear the selection after moving the piece
  scriptProperties.deleteProperty("selectedPieceCell");

  // Switch the turn
  scriptProperties.setProperty("turn", turn === "white" ? "black" : "white");

  SpreadsheetApp.getUi().alert("Castling performed.");
}

function promptForPromotion(pawnColor) {
  var ui = SpreadsheetApp.getUi();
  var pieceOptions = pawnColor === 'white' 
    ? "1. Queen (♕)\n2. Rook (♖)\n3. Bishop (♗)\n4. Knight (♘)"
    : "1. Queen (♛)\n2. Rook (♜)\n3. Bishop (♝)\n4. Knight (♞)";
  
  var response = ui.prompt(
    "Pawn Promotion",
    "Select the piece you want to promote to:\n" + pieceOptions,
    ui.ButtonSet.OK
  );

  var piece;
  switch (response.getResponseText().trim()) {
    case "1":
      piece = pawnColor === 'white' ? "♕" : "♛"; // Queen
      break;
    case "2":
      piece = pawnColor === 'white' ? "♖" : "♜"; // Rook
      break;
    case "3":
      piece = pawnColor === 'white' ? "♗" : "♝"; // Bishop
      break;
    case "4":
      piece = pawnColor === 'white' ? "♘" : "♞"; // Knight
      break;
    default:
      ui.alert("Invalid selection. Please enter 1 for Queen, 2 for Rook, 3 for Bishop, or 4 for Knight.");
      return null;
  }
  return piece;
}

function updateCapturedPieces(capturedPiece) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("ChessBoard");
  var capturedCell = sheet.getRange("I2");

  // Get the current list of captured pieces
  var currentCapturedList = capturedCell.getValue();
  var capturedArray = currentCapturedList ? currentCapturedList.split(',').map(piece => piece.trim()) : [];

  // Add the new captured piece to the list
  capturedArray.push(capturedPiece);

  // Sort the list (optional: you can customize the sorting if needed)
  capturedArray.sort();

  // Update the cell with the new sorted list
  capturedCell.setValue(capturedArray.join(', '));
}
