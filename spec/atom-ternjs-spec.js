'use babel'

let [workspaceElement, editor, editorElement, pack] = [];
let path = require('path');

function sharedSetup() {

  atom.project.setPaths([path.join(__dirname, 'fixtures')]);
  workspaceElement = atom.views.getView(atom.workspace)

  waitsForPromise(() => {

    return atom.packages.activatePackage('atom-ternjs').then((pkg) => {

      pack = pkg.mainModule;
    });
  });

  waitsForPromise(() => {

    return atom.workspace.open('test.js');
  });

  runs(() => {

    editor = atom.workspace.getActiveTextEditor();
    editorElement = atom.views.getView(editor);
  });
}

describe('atom-ternjs', () => {

  beforeEach(() => {

    sharedSetup(true);
  });

  describe('activate()', () => {

    it('activates atom-ternjs and initializes the autocomplete-plus provider', () => {

      expect(pack.provider).toBeDefined();
    });

    it('activates atom-ternjs and initializes the manager', () => {

      expect(pack.manager).toBeDefined();
    });
  });

  describe('deactivate()', () => {

    beforeEach(() => {

      editor.setCursorBufferPosition([4, 15]);
      atom.packages.deactivatePackage('atom-ternjs');
    });

    it('deactivates atom-ternjs', () => {

      expect(pack.manager).toBeUndefined();
      expect(pack.provider).toBeUndefined();
    });

    it('destroys all views', () => {

      expect(workspaceElement.querySelectorAll('atom-ternjs-reference').length).toBe(0);
      expect(workspaceElement.querySelectorAll('atom-ternjs-rename').length).toBe(0);
      expect(workspaceElement.querySelectorAll('atom-ternjs-config').length).toBe(0);
      expect(workspaceElement.querySelectorAll('atom-ternjs-documentation').length).toBe(0);
      expect(workspaceElement.querySelectorAll('atom-ternjs-type').length).toBe(0);
      expect(editorElement.querySelectorAll('atom-text-editor .scroll-view .atom-ternjs-definition-marker').length).toBe(0);
    });
  });
});

describe('atom-ternjs', () => {

  beforeEach(() => {

    sharedSetup(false);
  });

  describe('activate()', () => {


  });
});
