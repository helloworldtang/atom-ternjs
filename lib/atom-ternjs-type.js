'use babel';

const TypeView = require('./atom-ternjs-type-view');
const TOLERANCE = 20;

import manager from './atom-ternjs-manager';
import packageConfig from './atom-ternjs-package-config';
import emitter from './atom-ternjs-events';
import {Range} from 'atom';
import {
  prepareType,
  prepareInlineDocs,
  extractParams,
  formatType
} from './atom-ternjs-helper';

class Type {

  constructor() {

    this.view = null;
    this.overlayDecoration = null;

    this.destroyOverlayHandler = this.destroyOverlay.bind(this);
  }

  init() {

    this.view = new TypeView();
    this.view.initialize(this);

    atom.views.getView(atom.workspace).appendChild(this.view);

    emitter.on('type-destroy-overlay', this.destroyOverlayHandler);
  }

  setPosition() {

    this.destroyOverlay();

    const editor = atom.workspace.getActiveTextEditor();

    if (!editor) {

      return;
    }

    const marker = editor.getLastCursor && editor.getLastCursor().getMarker();

    if (!marker) {

      return;
    }

    this.overlayDecoration = editor.decorateMarker(marker, {

      type: 'overlay',
      item: this.view,
      class: 'atom-ternjs-type',
      position: 'tale',
      invalidate: 'touch'
    });
  }

  queryType(editor, cursor) {

    this.destroyOverlay();

    if (
      !packageConfig.options.inlineFnCompletion ||
      !cursor ||
      cursor.destroyed ||
      !manager.client
    ) {

      return;
    }

    const scopeDescriptor = cursor.getScopeDescriptor();

    if (scopeDescriptor.scopes.join().match(/comment/)) {

      return;
    }

    let rowStart = 0;
    let rangeBefore = false;
    let tmp = false;
    let may = 0;
    let may2 = 0;
    let skipCounter = 0;
    let skipCounter2 = 0;
    let paramPosition = 0;
    const position = cursor.getBufferPosition();
    const buffer = editor.getBuffer();

    if (position.row - TOLERANCE < 0) {

      rowStart = 0;

    } else {

      rowStart = position.row - TOLERANCE;
    }

    buffer.backwardsScanInRange(/\]|\[|\(|\)|\,|\{|\}/g, new Range([rowStart, 0], [position.row, position.column]), (obj) => {

      // return early if we are inside a string
      if (editor.scopeDescriptorForBufferPosition(obj.range.start).scopes.join().match(/string/)) {

        return;
      }

      if (obj.matchText === '}') {

        may++;
        return;
      }

      if (obj.matchText === ']') {

        if (!tmp) {

          skipCounter2++;
        }

        may2++;
        return;
      }

      if (obj.matchText === '{') {

        if (!may) {

          rangeBefore = false;
          obj.stop();

          return;
        }

        may--;
        return;
      }

      if (obj.matchText === '[') {

        if (skipCounter2) {

          skipCounter2--;
        }

        if (!may2) {

          rangeBefore = false;
          obj.stop();
          return;
        }

        may2--;
        return;
      }

      if (obj.matchText === ')' && !tmp) {

        skipCounter++;
        return;
      }

      if (obj.matchText === ',' && !skipCounter && !skipCounter2 && !may && !may2) {

        paramPosition++;
        return;
      }

      if (obj.matchText === ',') {

        return;
      }

      if (obj.matchText === '(' && skipCounter) {

        skipCounter--;
        return;
      }

      if (skipCounter || skipCounter2) {

        return;
      }

      if (obj.matchText === '(' && !tmp) {

        rangeBefore = obj.range;
        obj.stop();

        return;
      }

      tmp = obj.matchText;
    });

    if (!rangeBefore) {

      return;
    }

    manager.client.update(editor).then((data) => {

      manager.client.type(editor, rangeBefore.start).then((data) => {

        if (!data || data.type === '?' || !data.exprName) {

          return;
        }

        const type = prepareType(data);
        const params = extractParams(type);
        formatType(data);

        if (params && params[paramPosition]) {

          const offsetFix = paramPosition > 0 ? ' ' : '';
          data.type = data.type.replace(params[paramPosition], `${offsetFix}<span class="text-info">${params[paramPosition]}</span>`);
        }

        if (
          data.doc &&
          packageConfig.options.inlineFnCompletionDocumentation
        ) {

          data.doc = data.doc && data.doc.replace(/(?:\r\n|\r|\n)/g, '<br />');
          data.doc = prepareInlineDocs(data.doc);
        }

        this.view.setData(data);

        this.setPosition();
      })
      .catch((error) => {

        // most likely the type wasn't found. ignore it.
      });
    });
  }

  destroyOverlay() {

    if (this.overlayDecoration) {

      this.overlayDecoration.destroy();
    }

    this.overlayDecoration = null;
  }

  destroy() {
    
    emitter.off('destroy-type-overlay', this.destroyOverlayHandler);

    this.destroyOverlay();

    if (this.view) {

      this.view.destroy();
      this.view = null;
    }
  }
}

export default new Type();
