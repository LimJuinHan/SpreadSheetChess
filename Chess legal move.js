function isLegalMove(piece, fromRow, fromCol, toRow, toCol) {
  var scriptProperties = PropertiesService.getScriptProperties();
  var lastDoubleStep = scriptProperties.getProperty("lastDoubleStep");
  
  var rowDiff = Math.abs(toRow - fromRow);
  var colDiff = Math.abs(toCol - fromCol);

  switch (piece) {
    case "♙": // White Pawn
      if (fromRow === 6 && toRow === 4 && colDiff === 0) {
        // Store last double-step move
        scriptProperties.setProperty("lastDoubleStep", JSON.stringify({ row: toRow, col: toCol, color: "white" }));
        return true; // initial 2-step move
      }
      if (rowDiff === 1 && colDiff === 0 && toRow < fromRow) return true; // normal 1-step move
      if (rowDiff === 1 && colDiff === 1 && toRow < fromRow) return true; // capture move

      // En Passant for white
      if (rowDiff === 1 && colDiff === 1 && toRow < fromRow) {
        var enPassantTarget = JSON.parse(lastDoubleStep || "{}");
        if (enPassantTarget.row === fromRow && enPassantTarget.col === toCol && enPassantTarget.color === "black") {
          return true;
        }
      }
      break;

    case "♟": // Black Pawn
      if (fromRow === 1 && toRow === 3 && colDiff === 0) {
        // Store last double-step move
        scriptProperties.setProperty("lastDoubleStep", JSON.stringify({ row: toRow, col: toCol, color: "black" }));
        return true; // initial 2-step move
      }
      if (rowDiff === 1 && colDiff === 0 && toRow > fromRow) return true; // normal 1-step move
      if (rowDiff === 1 && colDiff === 1 && toRow > fromRow) return true; // capture move

      // En Passant for black
      if (rowDiff === 1 && colDiff === 1 && toRow > fromRow) {
        var enPassantTarget = JSON.parse(lastDoubleStep || "{}");
        if (enPassantTarget.row === fromRow && enPassantTarget.col === toCol && enPassantTarget.color === "white") {
          return true;
        }
      }
      break;

    case "♖": case "♜": // Rook (White and Black)
      if (rowDiff === 0 || colDiff === 0) return true;
      break;

    case "♘": case "♞": // Knight (White and Black)
      if (rowDiff === 2 && colDiff === 1) return true;
      if (rowDiff === 1 && colDiff === 2) return true;
      break;

    case "♗": case "♝": // Bishop (White and Black)
      if (rowDiff === colDiff) return true;
      break;

    case "♕": case "♛": // Queen (White and Black)
      if (rowDiff === colDiff || rowDiff === 0 || colDiff === 0) return true;
      break;

    case "♔": case "♚": // King (White and Black)
      if (rowDiff <= 1 && colDiff <= 1) return true;
      break;
  }
  
  // Default: move is illegal
  return false;
}

function detectEnPassant(piece, moveInfo, turn) {
  if (piece === "♙" || piece === "♟") { // If the piece is a pawn
    if (Math.abs(moveInfo.fromCol - moveInfo.toCol) === 1 && targetCell.getValue() === "") { // Diagonal move to an empty cell
      if ((piece === "♙" && moveInfo.fromRow === 3 && moveInfo.toRow === 2) || 
          (piece === "♟" && moveInfo.fromRow === 4 && moveInfo.toRow === 5)) {
        return true;
      }
    }
  }
  return false;
}

function isKingInCheck(turn, sheet) {
  var king = (turn === "white") ? "♔" : "♚";
  var kingPosition;

  // Find the king's position
  for (var i = 1; i <= 8; i++) {
    for (var j = 1; j <= 8; j++) {
      var cell = sheet.getRange(i, j).getValue();
      if (cell === king) {
        kingPosition = { row: i - 1, col: j - 1 }; // Store 0-indexed position
        break;
      }
    }
  }

  // Check if any opposing piece can move to the king's position
  for (var i = 1; i <= 8; i++) {
    for (var j = 1; j <= 8; j++) {
      var piece = sheet.getRange(i, j).getValue();
      if ((turn === "white" && isBlackPiece(piece)) || 
          (turn === "black" && isWhitePiece(piece))) {
        if (isLegalMove(piece, i - 1, j - 1, kingPosition.row, kingPosition.col)) {
          return true; // King is in check
        }
      }
    }
  }
  return false; // King is not in check
}

function isCastlingMove(piece, moveInfo, turn) {
  // Check if the piece is a king and the move is a two-square horizontal move
  return (piece === "♔" || piece === "♚") && Math.abs(moveInfo.fromCol - moveInfo.toCol) === 2 && moveInfo.fromRow === moveInfo.toRow;
}

function canCastle(sheet, moveInfo, turn) {
  var fromRow = moveInfo.fromRow;
  var toCol = moveInfo.toCol;
  var rookCol = (toCol > moveInfo.fromCol) ? 7 : 0; // Right-side (kingside) or left-side (queenside) castling
  var rookCell = sheet.getRange(fromRow + 1, rookCol + 1);
  var rook = rookCell.getValue();

  // Ensure the rook is present and hasn't moved
  if ((turn === "white" && rook !== "♖") || (turn === "black" && rook !== "♜")) {
    return false;
  }

  // Check that the path between the king and rook is clear
  var startCol = Math.min(moveInfo.fromCol, rookCol) + 1;
  var endCol = Math.max(moveInfo.fromCol, rookCol) - 1;
  for (var col = startCol; col <= endCol; col++) {
    if (sheet.getRange(fromRow + 1, col + 1).getValue() !== "") {
      return false; // Path is blocked
    }
  }

  // Ensure the king is not moving through a square that is under attack or into check
  var direction = (toCol > moveInfo.fromCol) ? 1 : -1; // Determine the direction of movement
  for (var step = 0; step <= 2; step++) {
    var testCol = moveInfo.fromCol + step * direction;
    var testCell = sheet.getRange(fromRow + 1, testCol + 1);
    if (isKingInCheckAfterMove(sheet, turn, moveInfo.fromRow, moveInfo.fromCol, testCol)) {
      return false;
    }
  }

  return true; // Castling is allowed
}

function isKingInCheckAfterMove(sheet, turn, fromRow, fromCol, toCol) {
  var tempCell = sheet.getRange(fromRow + 1, toCol + 1);
  var originalValue = tempCell.getValue();
  tempCell.setValue(turn === "white" ? "♔" : "♚");

  var inCheck = isKingInCheck(turn, sheet);
  
  tempCell.setValue(originalValue); // Restore the original value

  return inCheck;
}

