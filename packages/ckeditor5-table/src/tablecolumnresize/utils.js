/**
 * @license Copyright (c) 2003-2022, CKSource Holding sp. z o.o. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-oss-license
 */

/**
 * @module table/tablecolumnresize/utils
 */

import { global } from 'ckeditor5/src/utils';
import {
	COLUMN_WIDTH_PRECISION,
	COLUMN_MIN_WIDTH_AS_PERCENTAGE,
	COLUMN_MIN_WIDTH_IN_PIXELS
} from './constants';

/**
 * Returns all the inserted or changed table model elements in a given change set. Only the tables
 * with 'columnsWidth' attribute are taken into account. The returned set may be empty.
 *
 * Most notably if an entire table is removed it will not be included in returned set.
 *
 * @param {Array.<module:engine/model/differ~DiffItem>} changes
 * @param {module:engine/model/model~Model} model
 * @returns {Set.<module:engine/model/element~Element>}
 */
export function getAffectedTables( changes, model ) {
	const affectedTables = new Set();

	for ( const change of changes ) {
		let referencePosition = null;

		// Checks if the particular change from the differ is:
		// - an insertion or removal of a table, a row or a cell,
		// - an attribute change on a table, a row or a cell.
		switch ( change.type ) {
			case 'insert':
				referencePosition = [ 'table', 'tableRow', 'tableCell' ].includes( change.name ) ?
					change.position :
					null;

				break;

			case 'remove':
				// If the whole table is removed, there's no need to update its column widths (#12201).
				referencePosition = [ 'tableRow', 'tableCell' ].includes( change.name ) ?
					change.position :
					null;

				break;

			case 'attribute':
				if ( change.range.start.nodeAfter ) {
					referencePosition = [ 'table', 'tableRow', 'tableCell' ].includes( change.range.start.nodeAfter.name ) ?
						change.range.start :
						null;
				}

				break;
		}

		if ( !referencePosition ) {
			continue;
		}

		const tableNode = ( referencePosition.nodeAfter && referencePosition.nodeAfter.name === 'table' ) ?
			referencePosition.nodeAfter : referencePosition.findAncestor( 'table' );

		// We iterate over the whole table looking for the nested tables that are also affected.
		for ( const node of model.createRangeOn( tableNode ).getItems() ) {
			if ( node.is( 'element' ) && node.name === 'table' && node.hasAttribute( 'columnWidths' ) ) {
				affectedTables.add( node );
			}
		}
	}

	return affectedTables;
}

/**
 * Calculates the percentage of the minimum column width given in pixels for a given table.
 *
 * @param {module:engine/model/element~Element} table
 * @param {module:core/editor/editor~Editor} editor
 * @returns {Number}
 */
export function getColumnMinWidthAsPercentage( table, editor ) {
	return COLUMN_MIN_WIDTH_IN_PIXELS * 100 / getTableWidthInPixels( table, editor );
}

/**
 * Calculates the table width in pixels.
 *
 * @param {module:engine/model/element~Element} table
 * @param {module:core/editor/editor~Editor} editor
 * @returns {Number}
 */
export function getTableWidthInPixels( table, editor ) {
	// It is possible for a table to not have a <tbody> element - see #11878.
	const referenceElement = getChildrenViewElement( table, 'tbody', editor ) || getChildrenViewElement( table, 'thead', editor );
	const domReferenceElement = editor.editing.view.domConverter.mapViewToDom( referenceElement );

	return getElementWidthInPixels( domReferenceElement );
}

// Returns the a view element with a given name that is nested directly in a `<table>` element
// related to a given `modelTable`.
//
// @private
// @param {module:engine/model/element~Element} table
// @param {module:core/editor/editor~Editor} editor
// @param {String} elementName Name of a view to be looked for, e.g. `'colgroup`', `'thead`'.
// @returns {module:engine/view/element~Element|undefined} Matched view or `undefined` otherwise.
function getChildrenViewElement( modelTable, elementName, editor ) {
	const viewFigure = editor.editing.mapper.toViewElement( modelTable );
	const viewTable = [ ...viewFigure.getChildren() ].find( viewChild => viewChild.is( 'element', 'table' ) );

	return [ ...viewTable.getChildren() ].find( viewChild => viewChild.is( 'element', elementName ) );
}

/**
 * Returns the computed width (in pixels) of the DOM element.
 *
 * @param {HTMLElement} domElement
 * @returns {Number}
 */
export function getElementWidthInPixels( domElement ) {
	return parseFloat( global.window.getComputedStyle( domElement ).width );
}

/**
 * Returns the column indexes on the left and right edges of a cell.
 *
 * @param {module:engine/model/element~Element} cell
 * @returns {Object}
 */
export function getColumnIndex( cell, columnIndexMap ) {
	const cellColumnIndex = columnIndexMap.get( cell );
	const cellWidth = cell.getAttribute( 'colspan' ) || 1;

	return {
		leftEdge: cellColumnIndex,
		rightEdge: cellColumnIndex + cellWidth - 1
	};
}

/**
 * Returns the total number of columns in a table.
 *
 * @param {module:engine/model/element~Element} table
 * @param {module:core/editor/editor~Editor} editor
 * @returns {Number}
 */
export function getNumberOfColumn( table, editor ) {
	return editor.plugins.get( 'TableUtils' ).getColumns( table );
}

/**
 * Rounds the provided value to a fixed-point number with defined number of digits after the decimal point.
 *
 * @param {Number|String} value
 * @returns {Number}
 */
export function toPrecision( value ) {
	const multiplier = Math.pow( 10, COLUMN_WIDTH_PRECISION );
	const number = parseFloat( value );

	return Math.round( number * multiplier ) / multiplier;
}

/**
 * Clamps the number within the inclusive lower (min) and upper (max) bounds. Returned number is rounded using the
 * {@link ~toPrecision `toPrecision()`} function.
 *
 * @param {Number} number
 * @param {Number} min
 * @param {Number} max
 * @returns {Number}
 */
export function clamp( number, min, max ) {
	if ( number <= min ) {
		return toPrecision( min );
	}

	if ( number >= max ) {
		return toPrecision( max );
	}

	return toPrecision( number );
}

/**
 * Creates an array with defined length and fills all elements with defined value.
 *
 * @param {Number} length
 * @param {*} value
 * @returns {Array.<*>}
 */
export function fillArray( length, value ) {
	return Array( length ).fill( value );
}

/**
 * Sums all array values that can be parsed to a float.
 *
 * @param {Array.<Number>} array
 * @returns {Number}
 */
export function sumArray( array ) {
	return array
		.map( value => parseFloat( value ) )
		.filter( value => !Number.isNaN( value ) )
		.reduce( ( result, item ) => result + item, 0 );
}

/**
 * Makes sure that the sum of the widths from all columns is 100%. If the sum of all the widths is not equal 100%, all the widths are
 * changed proportionally so that they all sum back to 100%. If there are columns without specified width, it will be distributed
 * equally between them based on the amount remaining after assigning the known widths.
 *
 * Currently, only widths provided as percentage values are supported.
 *
 * @param {Array.<Number>} columnWidths
 * @returns {Array.<Number>}
 */
export function normalizeColumnWidths( columnWidths ) {
	columnWidths = calculateMissingColumnWidths( columnWidths );
	const totalWidth = sumArray( columnWidths );

	if ( totalWidth === 100 ) {
		return columnWidths;
	}

	return columnWidths
		// Adjust all the columns proportionally.
		.map( columnWidth => toPrecision( columnWidth * 100 / totalWidth ) )
		// Due to rounding of numbers it may happen that the sum of the widths of all columns will not be exactly 100%. Therefore, the width
		// of the last column is explicitly adjusted (narrowed or expanded), since all the columns have been proportionally changed already.
		.map( ( columnWidth, columnIndex, columnWidths ) => {
			const isLastColumn = columnIndex === columnWidths.length - 1;

			if ( !isLastColumn ) {
				return columnWidth;
			}

			const totalWidth = sumArray( columnWidths );

			return toPrecision( columnWidth + 100 - totalWidth );
		} );
}

// Initializes the column widths by parsing the attribute value and calculating the uninitialized column widths. The special value 'auto'
// indicates that width for the column must be calculated. The width of such uninitialized column is calculated as follows:
// - If there is enough free space in the table for all uninitialized columns to have at least the minimum allowed width for all of them,
//   then set this width equally for all uninitialized columns.
// - Otherwise, just set the minimum allowed width for all uninitialized columns. The sum of all column widths will be greater than 100%,
//   but then it will be adjusted proportionally to 100% in {@link #normalizeColumnWidths `normalizeColumnWidths()`}.
//
// @private
// @param {Array.<Number>}
// @returns {Array.<Number>}
function calculateMissingColumnWidths( columnWidthsAttribute ) {
	const columnWidths = columnWidthsAttribute.map( columnWidth => columnWidth.trim() );

	const numberOfUninitializedColumns = columnWidths.filter( columnWidth => columnWidth === 'auto' ).length;

	if ( numberOfUninitializedColumns === 0 ) {
		return columnWidths.map( columnWidth => toPrecision( columnWidth ) );
	}

	const totalWidthOfInitializedColumns = sumArray( columnWidths );

	const widthForUninitializedColumn = Math.max(
		( 100 - totalWidthOfInitializedColumns ) / numberOfUninitializedColumns,
		COLUMN_MIN_WIDTH_AS_PERCENTAGE
	);

	return columnWidths
		.map( columnWidth => columnWidth === 'auto' ? widthForUninitializedColumn : columnWidth )
		.map( columnWidth => toPrecision( columnWidth ) );
}

// Inserts column resizer element into a view cell.
//
// @param {module:engine/view/downcastwriter~DowncastWriter} viewWriter View writer instance.
// @param {module:engine/view/element~Element} viewCell View cell.
export function insertColumnResizerElement( viewWriter, viewCell ) {
	let viewTableColumnResizerElement = [ ...viewCell.getChildren() ]
		.find( viewElement => viewElement.hasClass( 'ck-table-column-resizer' ) );

	if ( viewTableColumnResizerElement ) {
		return;
	}

	viewTableColumnResizerElement = viewWriter.createUIElement( 'div', {
		class: 'ck-table-column-resizer'
	} );

	viewWriter.insert(
		viewWriter.createPositionAt( viewCell, 'end' ),
		viewTableColumnResizerElement
	);
}

// Calculates the total horizontal space taken by the cell. That includes:
// * width;
// * left and red padding;
// * border width.
//
// @param {HTMLElement} domCell
// @returns {Number} Width in pixels without `px` at the end
export function getDomCellOuterWidth( domCell ) {
	const styles = global.window.getComputedStyle( domCell );

	return parseFloat( styles.width ) +
		parseFloat( styles.paddingLeft ) +
		parseFloat( styles.paddingRight ) +
		parseFloat( styles.borderWidth );
}
