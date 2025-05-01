// Recursive Descent Parser Code for an overly simple calculator
// The code in calculator.html initializes Tokenizer and then calls calculation().
// The appendLabel() and appendToCode functions() are provided by calculator.html


// Global Variables

var token // The current token

var POWisUsed // The POW subroutine code only needs to be added if the factor operator (^) is used
var FACisUsed 
var ABSisUsed

var COND_COUNT // counter to create unique labels for each conditional statement


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


// Lexical analyzer

function Tokenizer(data) {
	var sourceData = data // remaining input stream

	this.type = "" // current token type
	this.value = "" // current token value
	this.matched = "" // previously matched token value

	this.next = function() {  // advance to the next token
		var tokens = [ 'EXPROP','TERMOP','FACTOROP','PIPE','BANG','IF','THEN','ELSE','LPAREN','RPAREN','LAST','NUMBER','ILLEGAL','EOI'];
		var x = /^\s*(?:([+-])|([*/%])|([\^])|([|])|([!])|(if)|(then)|(else)|([(])|([)])|([@])|(\d+)|(.)|())|/.exec(sourceData);
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

// Calculation := Expr EOI  // one expression then end of input
function calculation() {
	POWisUsed = false
	FACisUsed = false
	ABSisUsed = false
	COND_COUNT = 0
	expr()
	if (!token.match("EOI")) error("command")
	appendToCode("lds 0   // make a copy and then")
	appendToCode("str RR  // put in the results register")
	appendToCode("lds 0   // make another copy and then")
	appendToCode("str IN  // put in the input register")
	appendToCode("halt    // one still left on the stack too")
	if (POWisUsed)
		addSubroutinePOW()
	if (FACisUsed)
		addSubroutineFAC()
	if (ABSisUsed)
		addSubroutineABS()
}

// Cond := Expr 
function cond(){
	expr()
}

// Expr :- IF Cond THEN Expr ELSE Expr | Term { ExprOp Term }
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
	if (token.match("BANG")){
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

// Value := LAST | ( Expr ) | NUMBER
function value() {
	if (token.match("LAST")) {
		appendToCode("ldr IN")
	} else if (token.match("LPAREN")) {
		expr()
		if (!token.match("RPAREN")) error("term")
	} else if (token.match("PIPE")){
		expr()
		appendToCode("bsr ABS")
		appendToCode("ldr RR")
		ABSisUsed = true
		if (!token.match("PIPE")) error("term")
	} else {
		if (!token.match("NUMBER")) error("term")
		appendToCode("ldc " + token.matched)
	}
}