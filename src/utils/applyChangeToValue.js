import mapPlainTextIndex from './mapPlainTextIndex'
import getPlainText from './getPlainText'
import spliceString from './spliceString'

// Applies a change from the plain text textarea to the underlying marked up value
// guided by the textarea text selection ranges before and after the change
const applyChangeToValue = (
  value,
  plainTextValue,
  { selectionStartBefore, selectionEndBefore, selectionEndAfter },
  config
) => {
  let oldPlainTextValue = getPlainText(value, config)

  let lengthDelta = oldPlainTextValue.length - plainTextValue.length
  if (selectionStartBefore === 'undefined') {
    selectionStartBefore = selectionEndAfter + lengthDelta
  }

  if (selectionEndBefore === 'undefined') {
    selectionEndBefore = selectionStartBefore
  }

  // Fixes an issue with replacing combined characters for complex input. Eg like acented letters on OSX
  if (
    selectionStartBefore === selectionEndBefore &&
    selectionEndBefore === selectionEndAfter &&
    oldPlainTextValue.length === plainTextValue.length
  ) {
    selectionStartBefore = selectionStartBefore - 1
  }

  // extract the insertion from the new plain text value
  let insert = plainTextValue.slice(selectionStartBefore, selectionEndAfter)

  // handling for Backspace key with no range selection
  let spliceStart = Math.min(selectionStartBefore, selectionEndAfter)

  let spliceEnd = selectionEndBefore
  if (selectionStartBefore === selectionEndAfter) {
    // handling for Delete key with no range selection
    spliceEnd = Math.max(selectionEndBefore, selectionStartBefore + lengthDelta)
  }

  let mappedSpliceStart = mapPlainTextIndex(value, config, spliceStart, 'START')
  let mappedSpliceEnd = mapPlainTextIndex(value, config, spliceEnd, 'END')

  let controlSpliceStart = mapPlainTextIndex(value, config, spliceStart, 'NULL')
  let controlSpliceEnd = mapPlainTextIndex(value, config, spliceEnd, 'NULL')
  let willRemoveMention =
    controlSpliceStart === null || controlSpliceEnd === null

  let newValue = spliceString(value, mappedSpliceStart, mappedSpliceEnd, insert)

  if (!willRemoveMention) {
    // test for auto-completion changes
    let controlPlainTextValue = getPlainText(newValue, config)
    if (controlPlainTextValue !== plainTextValue) {
      // some auto-correction is going on

      // Find the start of the changed region by comparing oldPlainTextValue with plainTextValue
      spliceStart = 0
      while (spliceStart < oldPlainTextValue.length && spliceStart < plainTextValue.length &&
             oldPlainTextValue[spliceStart] === plainTextValue[spliceStart]) {
        spliceStart++
      }

      // Find the end of the changed region
      let oldEnd = oldPlainTextValue.length - 1
      let newEnd = plainTextValue.length - 1
      while (oldEnd >= spliceStart && newEnd >= spliceStart &&
             oldPlainTextValue[oldEnd] === plainTextValue[newEnd]) {
        oldEnd--
        newEnd--
      }

      // The changed region is from spliceStart to oldEnd+1 in oldPlainTextValue
      // and should be replaced with the region from spliceStart to newEnd+1 in plainTextValue
      insert = plainTextValue.slice(spliceStart, newEnd + 1)
      spliceEnd = oldEnd + 1

      // re-map the corrected indices
      mappedSpliceStart = mapPlainTextIndex(value, config, spliceStart, 'START')
      mappedSpliceEnd = mapPlainTextIndex(value, config, spliceEnd, 'END')
      newValue = spliceString(value, mappedSpliceStart, mappedSpliceEnd, insert)
    }
  }

  return newValue
}

export default applyChangeToValue
