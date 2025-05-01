// Recursive Descent Parser Code for an overly simple calculator

// The code in calculator.html initializes Tokenizer and then calls calculation().
// The appendLabel() and appendToCode functions() are provided by calculator.html

// Global Variables

var token // The current token

var POWisUsed // power (exponentiation) operator used, need to generate function code
var FACisUsed // factorial operator is used, need to generate function code
var ABSisUsed // absolute value operator is used, need to generate function code
var UDFisUsed // user defined functions found, need to use MAIN wrapper
var PERMisUsed // permutation function used
var COMisUsed // combinational function used 

var COND_COUNT // counter to create unique labels for each conditional statement
var FUNC_BASE // tracks number of functions declared so far
var FUNC_ADDR // label/addresses for each function
var PARAM_BASE // tracks number of parameter offsets assigned (only while defining a function)
var PARAM_POS // offset positions for each parameter (only while defining a function)
var PARAM_COUNT // tracks the number of parameters in the user defined function

// Helper functions with valid pre-defined subroutines for FAC, POW, and ABS

function addSubroutineFAC() {
	appendLabel("FAC")
	appendToCode("link")
	appendToCode("ldl -2")
	appendToCode("ldc 1")
	appendToCode("le")
	appendToCode("brt FAC-BASE")
	appendToCode("ldl -2")
	appendToCode("ldc 1")
	appendToCode("sub")
	appendToCode("bsr FAC")
	appendToCode("ldl -2")
	appendToCode("ldr RR")
	appendToCode("mul")
	appendToCode("bra FAC-DONE")
	appendLabel("FAC-BASE")
	appendToCode("ldc 1")
	appendLabel("FAC-DONE")
	appendToCode("str RR")
	appendToCode("unlink")
	appendToCode("sts -1")
	appendToCode("ret")
} 

function addSubroutinePOW() {
	appendLabel("POW")
	appendToCode("link")
	appendToCode("ldl -2")
	appendToCode("ldc 0")
	appendToCode("le")
	appendToCode("brt POW-BASE")
	appendToCode("ldl -3")
	appendToCode("ldl -2")
	appendToCode("ldc 1")
	appendToCode("sub")
	appendToCode("bsr POW")
	appendToCode("ldr RR")
	appendToCode("ldl -3")
	appendToCode("mul")
	appendToCode("bra POW-DONE")
	appendLabel("POW-BASE")
	appendToCode("ldc 1")
	appendLabel("POW-DONE")
	appendToCode("str RR")
	appendToCode("unlink")
	appendToCode("sts -1")
	appendToCode("sts -1")
	appendToCode("ret")
}

function addSubroutineABS() {
	appendLabel("ABS")
	appendToCode("link")
	appendToCode("ldl -2")
	appendToCode("ldl -2")
	appendToCode("ldc 0")
	appendToCode("ge")
	appendToCode("brt ABS-DONE")
	appendToCode("neg")
	appendLabel("ABS-DONE")
	appendToCode("str RR")
	appendToCode("unlink")
	appendToCode("sts -1")
	appendToCode("ret")
}

function addSubroutinePERM(){
	appendLabel("PERM")
	appendToCode("link")
	appendToCode("ldl -3")
	appendToCode("bsr FAC")
	appendToCode("ldr RR")
	appendToCode("ldl -3")
	appendToCode("ldl -2")
	appendToCode("sub")
	appendToCode("bsr FAC")
	appendToCode("ldr RR")
	appendToCode("div")
	appendToCode("str RR")
	appendToCode("unlink")
	appendToCode("sts -1")
	appendToCode("sts -1")
	appendToCode("ret")
}

function addSubroutineCOM(){
	appendLabel("COM")
	appendToCode("link")
	appendToCode("ldl -3")
	appendToCode("bsr FAC")
	appendToCode("ldr RR")
	appendToCode("ldl -3")
	appendToCode("ldl -2")
	appendToCode("sub")
	appendToCode("bsr FAC")
	appendToCode("ldr RR")
	appendToCode("div")
	appendToCode("ldl -2")
	appendToCode("bsr FAC")
	appendToCode("ldr RR")
	appendToCode("div")
	appendToCode("str RR")
	appendToCode("unlink")
	appendToCode("sts -1")
	appendToCode("sts -1")
	appendToCode("ret")
}

// Lexical analyzer

function Tokenizer(data) {
	var sourceData = data // remaining input stream

	this.type = "" // current token type
	this.value = "" // current token value
	this.matched = "" // previously matched token value

	this.next = function() {  // advance to the next token
		var tokens = [ 'EXPROP','TERMOP','FACTOROP','LPAREN','RPAREN','LAST','NUMBER','PIPE','NEQ','BANG','FUNC','LESSEQ','GREATEREQ','LESS','GREATER','EQ','IF','THEN','ELSE','NAME','COMMA','ILLEGAL','EOI'];
		var x = /^\s*(?:([+-])|([*/%])|([\^])|([(])|([)])|([@])|(\d+)|([|])|(!=)|([!])|(func)|(<=)|(>=)|(<)|(>)|(=)|(if)|(then)|(else)|(\w+)|([,])|(.)|())/.exec(sourceData);
		sourceData = sourceData.replace(x.shift(),"");
		var i = x.findIndex(function(e) { return e != undefined })
		this.matched = this.value
		this.value = x[i]
		this.type = tokens[i]
		return this.type
	}

	this.match = function(target) { // advance to the next token if the current token matches
		if (this.type != target) {
			return false
		} else {
			this.next()
			return true
		}
	}

	this.next()  // initialize with the first token
}

// Parser & Translator

// Calculation := { FUNC FuncDef } Expr EOI
function calculation() {
	POWisUsed = false
	ABSisUsed = false
	FACisUsed = false
	UDFisUsed = false
	PERMisUsed = false
	COMisUsed = false
	FUNC_BASE = 0
	FUNC_ADDR = {}
	PARAM_COUNT = {}
	PARAM_BASE = -1 // last parameter will be at offset -2
	PARAM_POS = {}
	COND_COUNT = 0
	while (token.match("FUNC")) {
		if (!UDFisUsed) {
			appendToCode("bra MAIN")
			UDFisUsed = true
		}
		funcdef();
	}
	if (UDFisUsed)
		appendLabel("MAIN")
	expr()
	if (!token.match("EOI")) error("command")
	appendToCode("lds 0   // make a copy and then")
	appendToCode("str RR  // put in the results register")
	appendToCode("lds 0   // make another copy and then")
	appendToCode("str IN  // put in the input register")
	appendToCode("halt    // one still left on the stack too")
	if (POWisUsed)
		addSubroutinePOW()
	if (ABSisUsed)
		addSubroutineABS()
	if (FACisUsed)
		addSubroutineFAC()
	if (PERMisUsed)
		addSubroutinePERM()
	if (COMisUsed)
		addSubroutineCOM()
}

// FuncDef := NAME LPAREN [ NAME { COMMA NAME } ] RPAREN Expr
function funcdef() {
	if (!token.match("NAME")) error("funcdef")
	FUNC_BASE += 1
	FUNC_ADDR[token.matched] = 'F'+ FUNC_BASE
	appendLabel(FUNC_ADDR[token.matched])
	fname = token.matched
	appendToCode("link")
	if (!token.match("LPAREN")) error("funcdef")
	var params = [] // parameters need to be stored as they are encountered
	if (token.match("NAME")) {
		params.push(token.matched)
		while (token.match("COMMA")) {
			if (!token.match("NAME")) error("funcdef")
			params.push(token.matched)
		}
	}
	PARAM_COUNT[fname] = params.length
	// offsets are assigned in reverse to match how arguments will be pushed on the stack
	for (var i = params.length - 1; i >= 0; i--) {
		PARAM_BASE -= 1
		PARAM_POS[params[i]] = PARAM_BASE
	}
	if (!token.match("RPAREN")) error("funcdef")
	expr()
	appendToCode("str RR")
	appendToCode("unlink")
	// pop the arguments off of the stack before returning (always pulling 1 below the top of stack)
	for (var i = 0; i < params.length; i++)
		appendToCode("sts -1")
	appendToCode("ret")
	PARAM_BASE = -1 // reset for another function declaration
	PARAM_POS = {}
}


// Cond := Expr CondOp Expr
function cond() {
	expr() 
	if (token.match("LESSEQ")){
		expr()
		appendToCode("le")
	} else if (token.match("GREATEREQ")){
		expr()
		appendToCode("ge")
	} else if (token.match("LESS")){
		expr()
		appendToCode("lt")
	} else if (token.match("GREATER")){
		expr()
		appendToCode("gt")
	} else if (token.match("NEQ")){
		expr()
		appendToCode("ne")
	} else if (token.match("EQ")){
		expr()
		appendToCode("eq")
	}
}


// Expr := IF Cond THEN Expr ELSE Expr | Term { ExprOp Term }
function expr() {
	if (token.match("IF")){
		COND_COUNT += 1
		cond()
		if(!token.match("THEN")) error("no then")
		appendToCode("brf E" + COND_COUNT)
		expr()
		if(!token.match("ELSE")) error("no else")
		appendToCode("bra C" + COND_COUNT)
		appendLabel("E" + COND_COUNT)
		expr()
		appendLabel("C" + COND_COUNT)
	} else {
	term()
	while (token.match("EXPROP")) {
		var Eop = token.matched
		term()
		if (Eop == "-")
			appendToCode("sub")
		else
			appendToCode("add")
	}
}
}


// Term := Factor { TermOp Factor }
function term() {
	factor()
	while (token.match("TERMOP")) {
		var Top = token.matched
		factor()
		if (Top == "%")
			appendToCode("mod")
		else if (Top == "/")
			appendToCode("div")
		else
			appendToCode("mul")
	}
}

// Factor := { ExprOp } Value [ BANG ] [ FactorOp Expr ]   // unary + and -, right to left ^ associativity
function factor() {
	var isNeg = false
	while (token.match("EXPROP"))
		if (token.matched == "-")
			isNeg = !isNeg
	value()
	if (token.match("BANG")) {
		appendToCode("bsr FAC")
		appendToCode("ldr RR")
		FACisUsed = true
	}
	if (token.match("FACTOROP")) {
		expr()
		appendToCode("bsr POW")
		appendToCode("ldr RR")
		POWisUsed = true
	}
	if (isNeg)
		appendToCode("neg")
}


// @ is the value of the last calculation. It's being stored in the IN register
// so it can survive a program reload (even of an entirely new calculation).

// Value := LAST | ( Expr ) | PIPE Expr PIPE | P ( Expr, Expr ) | C ( Expr, Expr ) | NAME | NAME ( [ Expr { , Expr } ] ) | NUMBER
function value() {
	if (token.match("LAST")) {
		appendToCode("ldr IN")
	} else if (token.match("LPAREN")) {
		expr()
		if (!token.match("RPAREN")) error("term")
	} else if (token.match("PIPE")) {
		expr()
		if (!token.match("PIPE")) error("term")
		appendToCode("bsr ABS")
		appendToCode("ldr RR")
		ABSisUsed = true
	} else if (token.match("NAME")) {
		if (PARAM_POS[token.matched] != undefined) {  // name is a parameter being used inside a function
			appendToCode("ldl " + PARAM_POS[token.matched]) // code to access the parameter's value
		} else if (token.matched == 'P'){
			if (!token.match("LPAREN")) error("no left paren")
			expr()
			if (!token.match("COMMA")) error("no comma")
			expr()
			if (!token.match("RPAREN")) error("term")
			appendToCode("bsr PERM")
			appendToCode("ldr RR")
			PERMisUsed = true
			FACisUsed = true
		} else if (token.matched == 'C'){
			if (!token.match("LPAREN")) error("no left paren")
			expr()
			if (!token.match("COMMA")) error("no comma")
			expr()
			if (!token.match("RPAREN")) error("term")
			appendToCode("bsr COM")
			appendToCode("ldr RR")
			COMisUsed = true
			FACisUsed = true

		} else { // a name here is either a user defined function call or an error
			if (FUNC_ADDR[token.matched] == undefined) error("undefined function")
			var fname = token.matched
			var faddr = FUNC_ADDR[token.matched]
			var pcount = PARAM_COUNT[token.matched]
			if (!token.match("LPAREN")) error("no left paren")
			if (pcount > 0) {
				expr()
				for (var i = 0; i < pcount - 1; i++){
					if (!token.match("COMMA")) error("no comma")
					expr()
			}
		}
			if (!token.match("RPAREN")) error("term")
			appendToCode("bsr " + faddr)
			appendToCode("ldr RR")
			UDFisUsed = true
		}
	} else {
		if (!token.match("NUMBER")) error("term")
		appendToCode("ldc " + token.matched)
	}
}