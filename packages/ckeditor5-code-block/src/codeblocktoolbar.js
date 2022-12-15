/**
 * @module code-block/codeblocktoolbar
 */
 import { Plugin } from 'ckeditor5/src/core';
 import { WidgetToolbarRepository } from 'ckeditor5/src/widget';
 import { getClosestSelectedCodeblockView } from './utils';

 /**
  * The codeblock toolbar plugin. It creates and manages the codeblock toolbar. (the toolbar displayed when an codeblock is selected).
  */
 export default class CodeblockToolbar extends Plugin {
    /**
     * @inheritDoc
     */
    static get requires() {
        return [ WidgetToolbarRepository ];
    }

    /**
     * @inheritDoc
     */
    static get pluginName() {
        return 'CodeblockToolbar';
    }

    /**
     * @inheritDoc
     */
    afterInit() {
        const editor = this.editor;
        const t = editor.t;
        const widgetToolbarRepository = editor.plugins.get( WidgetToolbarRepository );

        widgetToolbarRepository.register( 'codeblock', {
            ariaLabel: t( 'Codeblock toolbar'),
            items: editor.config.get( 'codeblock.toolbar' ),
            getRelatedElement: selection => getClosestSelectedCodeblockView( selection )
        } );
    }
 }
 