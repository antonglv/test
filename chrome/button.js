argNames += ",fn"; var fn = new Function (argNames, code); args. push (fn); var gen = fn. apply (oButton, args); if ("isGenerator" in fn ? fn. isGenerator () : gen && typeof gen.next == "function") { fn. __generator = gen; gen. next (); }
// Above code should be in one line for correct error line numbers