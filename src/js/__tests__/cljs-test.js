/* @flow */

import startCLJS, * as cljs from '../cljs';
import startREPL from '../repl';

let vm = require('vm');

jest.mock('../repl');

jest.mock('../lumo', () => ({
  load: () => '',
}));

jest.mock('vm');

jest.useFakeTimers();

const ctx = {
  cljs: {
    nodejs: {
      enable_util_print_BANG_: () => {},
    },
  },
  lumo: {
    repl: {
      init: () => {},
      set_ns: () => {},
      execute: () => {},
      is_readable_QMARK_: () => true,
      get_current_ns: () => 'cljs.user',
      indent_space_count: (text: string) => 0,
      get_highlight_coordinates: (text: string) => 0,
      get_completions: (text: string) => [],
    },
  },
};

let cljsContext;

function setupVmMocks(): void {
  vm.createContext.mockImplementation((x: vm$Context) => x);

  vm.Script.prototype.runInContext.mockImplementation((context: vm$Context) => {
    cljsContext = Object.assign(context, ctx);
    return cljsContext;
  });
}

setupVmMocks();

describe('startClojureScriptEngine', () => {
  beforeEach(() => {
    startREPL.mockClear();
  });

  it('should start a REPL if opts.repl is true', () => {
    startCLJS({
      repl: true,
      scripts: [],
    });

    expect(startREPL).toHaveBeenCalled();
  });

  it('returns undefined if opts.repl is false', () => {
    const ret = startCLJS({
      repl: false,
      scripts: [],
      earmuffedArgs: [],
    });

    expect(startREPL).not.toHaveBeenCalled();
    expect(ret).toBeUndefined();

    startREPL.mockClear();

    const ret2 = startCLJS({
      repl: false,
      scripts: [['text', ':foo'], ['path', 'foo.cljs']],
      earmuffedArgs: [],
    });

    expect(startREPL).not.toHaveBeenCalled();
    expect(ret2).toBeUndefined();
  });

  it('calls `executeScript` and bails if there\'s a main opt', () => {
    startCLJS({
      repl: false,
      mainScript: 'foo.cljs',
      scripts: [],
    });

    expect(startREPL).not.toHaveBeenCalled();
  });

  it('doesn\'t init the CLJS engine if it already started', () => {
    startCLJS({
      repl: true,
      // scripts will init the ClojureScript engine
      scripts: [['text', ':foo'], ['path', 'foo.cljs']],
      earmuffedArgs: [],
    });

    expect(startREPL).toHaveBeenCalled();
  });

  describe('in development', () => {
    let startClojureScriptEngine;

    beforeAll(() => {
      jest.resetModules();
      /* eslint-disable global-require */
      startClojureScriptEngine = require('../cljs').default;
      vm = require('vm');
      /* eslint-enable global-require */
      setupVmMocks();
    });

    it('creates and returns a vm context', () => {
      startClojureScriptEngine({
        repl: true,
        scripts: [],
        earmuffedArgs: [],
      });

      jest.runAllTicks();
      expect(vm.createContext).toHaveBeenCalled();
      expect(vm.createContext).toHaveBeenCalledTimes(1);
    });
  });

  describe('in production', () => {
    let startClojureScriptEngine;

    beforeEach(() => {
      jest.resetModules();
      Object.assign(global, {
        initialize: jest.fn(),
        __DEV__: false,
      }, ctx);
      // eslint-disable-next-line global-require
      startClojureScriptEngine = require('../cljs').default;
    });

    afterEach(() => {
      Object.keys(ctx).concat(['initialize']).forEach((key: string, idx: number) => {
        global[key] = undefined;
      });
      __DEV__ = true;
    });

    it('calls the global initialize function', () => {
      startClojureScriptEngine({
        repl: true,
        scripts: [],
        earmuffedArgs: [],
      });

      jest.runAllTicks();

      // eslint-disable-next-line no-undef
      expect(initialize).toHaveBeenCalled();
    });
  });
});

describe('isReadable', () => {
  it('calls into the CLJS context', () => {
    expect(cljs.isReadable('()')).toBe(true);
  });
});

describe('getCurrentNamespace', () => {
  it('calls into the CLJS context', () => {
    expect(cljs.getCurrentNamespace()).toBe('cljs.user');
  });
});

describe('indentSpaceCount', () => {
  it('calls into the CLJS context', () => {
    expect(cljs.indentSpaceCount('')).toBe(0);
  });
});

describe('getHighlightCoordinates', () => {
  it('calls into the CLJS context', () => {
    expect(cljs.getHighlightCoordinates('(let [a 1)')).toBe(0);
  });
});

describe('indentSpaceCount', () => {
  it('calls into the CLJS context', () => {
    expect(cljs.getCompletions('(de)')).toEqual([]);
  });
});

describe('lumoEval', () => {
  describe('in development', () => {
    beforeEach(() => {
      vm.runInContext.mockClear();
    });

    it('evals expressions in the ClojureScript context', () => {
      startCLJS({
        repl: true,
        _: [],
        scripts: [],
      });
      jest.runAllTicks();

      cljsContext.LUMO_EVAL('source');
      expect(vm.runInContext).toHaveBeenCalledTimes(1);
    });
  });

  describe('in production', () => {
    let startClojureScriptEngine;

    beforeEach(() => {
      jest.resetModules();
      Object.assign(global, {
        initialize: jest.fn(),
        __DEV__: false,
      }, ctx);
      // eslint-disable-next-line global-require
      startClojureScriptEngine = require('../cljs').default;
    });

    afterEach(() => {
      Object.keys(ctx).concat(['initialize']).forEach((key: string, idx: number) => {
        global[key] = undefined;
      });
      __DEV__ = true;
    });

    it('evals expressions in the ClojureScript context', () => {
      startClojureScriptEngine({
        repl: true,
        _: [],
        scripts: [],
        earmuffedArgs: [],
      });
      jest.runAllTicks();

      cljsContext.LUMO_EVAL('source');
      expect(vm.runInThisContext).toHaveBeenCalledTimes(1);
    });
  });
});
