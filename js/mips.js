var signalNames = ["regDst", "jump", "branch", "memRead", "memToReg", "ALUOp", "memWrite", "ALUSrc", "regWrite", "wholeW", "signed", "Zero"];
var registerNames = ["zero", "at", "v0", "v1", "a0", "a1", "a2", "a3", "t0", "t1", "t2", "t3", "t4", "t5", "t6", "t7", "s0", "s1", "s2", "s3", "s4", "s5", "s6", "s7", "t8", "t9", "k0", "k1", "gp", "sp", "fp", "ra"];
var signals, registers;
var pc, mem, text, map, org;
var dataBegin = 100, dataOffset;
var stackBegin = 299, stackOffset;
var done = [], count;

function init() {
  reset();
  generateGUI();
}

function reset() {
  registers = [];
  for(var i = 0; i < registerNames.length; ++i) registers[extend((i).toString(2), 5)] = extend("", 32);
  signals = [];
  for(var i = 0; i < signalNames.length; ++i) signals[signalNames[i]] = 0;
  signals["ALUOp"] = extend("", 4);
  mem = [], text = [], map = [];
  stackOffset = 0, dataOffset = 0;
  org = Number($("#org").val());
  for(var i = org; i < org + dataBegin; ++i) mem[i] = extend("", 32);
  for(var i = org + dataBegin; i < org + stackBegin - dataBegin + 1; ++i) mem[i] = extend("", 32);
  for(var i = org + stackBegin - dataBegin + 1; i < org + stackBegin + 1; ++i) mem[i] = extend("", 32);
  pc = extend((org << 2).toString(2), 32);
  registers["11101"] = extend(((org + stackBegin) << 2).toString(2), 32);
  registers["IF/ID"] = extend("", 64);
  registers["ID/EX"] = extend("", 156);
  registers["EX/MEM"] = extend("", 109);
  registers["MEM/WB"] = extend("", 71);
  done = [false, false, false, false, false], count = 0;
}

function parseCode() {
  reset();
  var lines = $("#editor").val().split("\n").map(function(n) { return n.trim(); }).filter(function(n) { return n != ""; });
  var c = 0;
  for(var i = 0; i < lines.length; ++i) {
    if(lines[i] == ".text") {
      for(var j = i + 1; j < lines.length && lines[j].charAt(0) != "."; ++j) {
        var token = lines[j].split(" ").map(function(n) { return n.trim(); });
        if(token[0].slice(-1) == ':') {
          map[token[0].slice(0, -1)] = extend(((org + c) << 2).toString(2), 32);
        }
        ++c;
      }
      i = j - 1;
    }
  }
  console.log(map);
  for(var i = 0; i < lines.length; ++i) {
    if(lines[i] == ".data") {
      for(var j = i + 1; j < lines.length && lines[j].charAt(0) != "."; ++j) {
        var token = lines[j].split(" ").map(function(n) { return n.trim(); });
        var label = token[0].slice(0, -1);
        if(token[1] == ".word") {
          token = lines[j].split(".word")[1].trim().split(",").map(function(n) { return n.trim(); });
          for(var k = 0; k < token.length; ++k) {
            mem[org + dataBegin + dataOffset] = extend((Number(token[k]) >>> 0).toString(2), 32);
            map[label] = extend(((org + dataBegin + dataOffset) << 2).toString(2), 32);
            ++dataOffset;
          }
        }
      }
      i = j - 1;
    } else if(lines[i] == ".text") {
      for(var j = i + 1; j < lines.length && lines[j].charAt(0) != "."; ++j) {
        var token = lines[j].split(" ").map(function(n) { return n.trim(); });
        if(token[0].slice(-1) == ':') token.shift();
        if(token[0] == "move") token[0] = "addi", token[2] += ",", token[3] = "0";
        else if(token[0] == "blt") {
          var label = token[3];
          token = ["slt", "$t0,", token[1], token[2]];
          var bin = toBin(token.join(" "));
          mem[org + text.length] = bin;
          text.push(bin);
          token = ["bne", "$t0,", "$zero,", label];
        }
        if(token[0] != null && token[0] != "") {
          var bin = toBin(token.join(" "));
          mem[org + text.length] = bin;
          text.push(bin);
        }
      }
      i = j - 1;
    }
  }
}

function toBin(line) {
  var token = line.split(" ").map(function(n) { return n.trim(); }), result;
  switch(token[0]) {
  // r format
  case "add":
    var rd = token[1].slice(1, -1), rdi = token[1].charAt(2) - '0';
    var rs = token[2].slice(1, -1), rsi = token[2].charAt(2) - '0';
    var rt = token[3].slice(1), rti = token[3].charAt(2) - '0';
    result = "000000" + mapRegister(rs, rsi) + mapRegister(rt, rti) + mapRegister(rd, rdi) + "00000100000";
    break;
  case "sub":
    var rd = token[1].slice(1, -1), rdi = token[1].charAt(2) - '0';
    var rs = token[2].slice(1, -1), rsi = token[2].charAt(2) - '0';
    var rt = token[3].slice(1), rti = token[3].charAt(2) - '0';
    result = "000000" + mapRegister(rs, rsi) + mapRegister(rt, rti) + mapRegister(rd, rdi) + "00000100010";
    break;
  case "and":
    var rd = token[1].slice(1, -1), rdi = token[1].charAt(2) - '0';
    var rs = token[2].slice(1, -1), rsi = token[2].charAt(2) - '0';
    var rt = token[3].slice(1), rti = token[3].charAt(2) - '0';
    result = "000000" + mapRegister(rs, rsi) + mapRegister(rt, rti) + mapRegister(rd, rdi) + "00000100100";
    break;
  case "nor":
    var rd = token[1].slice(1, -1), rdi = token[1].charAt(2) - '0';
    var rs = token[2].slice(1, -1), rsi = token[2].charAt(2) - '0';
    var rt = token[3].slice(1), rti = token[3].charAt(2) - '0';
    result = "000000" + mapRegister(rs, rsi) + mapRegister(rt, rti) + mapRegister(rd, rdi) + "00000100111";
    break;
  case "slt":
    var rd = token[1].slice(1, -1), rdi = token[1].charAt(2) - '0';
    var rs = token[2].slice(1, -1), rsi = token[2].charAt(2) - '0';
    var rt = token[3].slice(1), rti = token[3].charAt(2) - '0';
    result = "000000" + mapRegister(rs, rsi) + mapRegister(rt, rti) + mapRegister(rd, rdi) + "00000101010";
    break;
  case "sltu":
    var rd = token[1].slice(1, -1), rdi = token[1].charAt(2) - '0';
    var rs = token[2].slice(1, -1), rsi = token[2].charAt(2) - '0';
    var rt = token[3].slice(1), rti = token[3].charAt(2) - '0';
    result = "000000" + mapRegister(rs, rsi) + mapRegister(rt, rti) + mapRegister(rd, rdi) + "00000101001";
    break;
  case "sll":
    var rd = token[1].slice(1, -1), rdi = token[1].charAt(2) - '0';
    var rs = token[2].slice(1, -1), rsi = token[2].charAt(2) - '0';
    var rt = extend(Number(token[3]).toString(2), 5);
    result = "000000" + mapRegister(rs, rsi) + "00000" + mapRegister(rd, rdi) + rt + "000000";
    break;
  case "srl":
    var rd = token[1].slice(1, -1), rdi = token[1].charAt(2) - '0';
    var rs = token[2].slice(1, -1), rsi = token[2].charAt(2) - '0';
    var rt = extend(Number(token[3]).toString(2), 5);
    result = "000000" + mapRegister(rs, rsi) + "00000" + mapRegister(rd, rdi) + rt + "000010";
    break;
  case "jr":
    var rd = token[1].slice(1), rdi = token[1].charAt(2) - '0';
    result = "000000" + mapRegister(rd, rdi) + "000000000000000001000";
    break;

  // i format
  case "addi":
    var rt = token[1].slice(1, -1), rti = token[1].charAt(2) - '0';
    var rs = token[2].slice(1, -1), rsi = token[2].charAt(2) - '0';
    var offset = Number(token[3]);
    offset = extend((offset >>> 0).toString(2), 32).slice(16);
    result = "001000" + mapRegister(rs, rsi) + mapRegister(rt, rti) + offset;
    break;
  case "lw":
    var rt = token[1].slice(1, -1), rti = token[1].charAt(2) - '0';
    var sec = token[2];
    var offset = "";
    for(var i = 0; i < sec.length; ++i) {
  		if(sec.charAt(i) == '(') break;
  		offset += sec.charAt(i);
    }
    var rs = sec.slice(i + 2, -2);
    var rsi = sec.slice(-2, -1) - '0';
    offset = Number(offset);
    offset = signExtend(offset.toString(2), 16, offset < 0 ? '1' : '0');
    result = "100011" + mapRegister(rs, rsi) + mapRegister(rt, rti) + offset;
    break;
  case "sw":
    var rt = token[1].slice(1, -1), rti = token[1].charAt(2) - '0';
    var sec = token[2];
    var offset = "";
    for(var i = 0; i < sec.length; ++i) {
  		if(sec.charAt(i) == '(') break;
  		offset += sec.charAt(i);
    }
    var rs = sec.slice(i + 2, -2);
    var rsi = sec.slice(-2, -1) - '0';
    offset = Number(offset);
    offset = signExtend(offset.toString(2), 16, offset < 0 ? '1' : '0');
    result = "101011" + mapRegister(rs, rsi) + mapRegister(rt, rti) + offset;
    break;
  case "bne":
    var rs = token[1].slice(1, -1), rsi = token[1].charAt(2) - '0';
    var rt = token[2].slice(1, -1), rti = token[2].charAt(2) - '0';
    var offset = map[token[3]].slice(16);
    result = "000101" + mapRegister(rs, rsi) + mapRegister(rt, rti) + offset;
    break;
  case "beq":
    var rs = token[1].slice(1, -1), rsi = token[1].charAt(2) - '0';
    var rt = token[2].slice(1, -1), rti = token[2].charAt(2) - '0';
    var offset = map[token[3]].slice(16);
    result = "000100" + mapRegister(rs, rsi) + mapRegister(rt, rti) + offset;
    break;
  case "lb":
    var rs = token[1].slice(1, -1), rsi = token[1].charAt(2) - '0';
    var sec = token[2];
    var offset = "";
    for(var i = 0; i < sec.length; ++i) {
  		if(sec.charAt(i) == '(') break;
  		offset += sec.charAt(i);
    }
    var rt = sec.slice(i + 2, -2);
    var rti = sec.slice(-2, -1) - '0';
    offset = Number(offset) >>> 0;
    offset = signExtend(offset.toString(2), 16, offset < 0 ? '1' : '0');
    result = "100000" + mapRegister(rs, rsi) + mapRegister(rt, rti) + offset;
    break;
  case "lbu":
    var rs = token[1].slice(1, -1), rsi = token[1].charAt(2) - '0';
    var sec = token[2];
    var offset = "";
    for(var i = 0; i < sec.length; ++i) {
  		if(sec.charAt(i) == '(') break;
  		offset += sec.charAt(i);
    }
    var rt = sec.slice(i + 2, -2);
    var rti = sec.slice(-2, -1) - '0';
    offset = Number(offset) >>> 0;
    offset = extend(offset.toString(2), 16);
    result = "100100" + mapRegister(rs, rsi) + mapRegister(rt, rti) + offset;
    break;
  case "sb":
    var rs = token[1].slice(1, -1), rsi = token[1].charAt(2) - '0';
    var sec = token[2];
    var offset = "";
    for(var i = 0; i < sec.length; ++i) {
  		if(sec.charAt(i) == '(') break;
  		offset += sec.charAt(i);
    }
    offset = Number(offset) >>> 0;
    offset = signExtend(offset.toString(2), 16, offset < 0 ? '1' : '0');
    var rt = sec.slice(i + 2, -2);
    var rti = sec.slice(-2, -1) - '0';
    result = "101000" + mapRegister(rs, rsi) + mapRegister(rt, rti) + offset;
    break;
  case "lui":
    var rt = token[1].slice(1, -1), rti = token[1].charAt(2) - '0';
    var sec = token[2];
    var offset = extend((Number(sec) >>> 0).toString(2), 32);
    offset = signExtend(offset.slice(16), 16, offset < 0 ? '1' : '0');
    result = "00111100000" + mapRegister(rt, rti) + offset;
    break;
  // j format
  case "j":
    var offset = map[token[1]].slice(4, 30);
    result = "000010" + offset;
    break;
  case "jal":
    var offset = map[token[1]].slice(4, 30);
    result = "000011" + offset;
    break;
  }
  return result;
}

function fetch() {
  console.log("fetch();");
  i = (parseInt(pc, 2) >>> 2) - org;
  if(i == text.length) {
    done[0] = true;
    ++count;
    return;
  }
  ++count;
  var line = mem[i + org];
  var opcode = line.slice(0, 6);
  var funcode = line.slice(26);
  pc = extend((parseInt(pc, 2) + 4).toString(2), 32);
  registers["IF/ID"] = line + pc;
  i = (parseInt(pc, 2) >>> 2) - org;
  if(opcode == "000100") { //beq
    if(registers[line.slice(6, 11)] == registers[line.slice(11, 16)]) {
      pc = extend(line.slice(16), 32);
    }
  }
  if(opcode == "000101") { //bne
    if(registers[line.slice(6, 11)] != registers[line.slice(11, 16)]) {
      pc = extend(line.slice(16), 32);
    }
  }
  if(opcode == "000011") { // jal
  	registers["11111"] = pc;
  	pc = pc.slice(0, 4) + line.slice(6) + "00";
  }
  if(opcode == "000010") { // j
  	pc = pc.slice(0, 4) + line.slice(6) + "00";
  }
  if(opcode == "000000" && funcode == "001000") { // jr 
  	pc = registers[line.slice(6, 11)];
  }
}

function extend(str, num) {
  var result = str;
  for(var i = 0; i < num - str.length; ++i) result = "0" + result;
  return result;
}

function signExtend(str, num, val) {
  var result = str;
  for(var i = 0; i < num - str.length; ++i) result = val + result;
  return result;
}

function mapRegister(register, index) {
  switch(register) {
  case "zero": return "00000";
  case "at": return "00001";
  case "k": return "11010";
  case "gp": return "11100";
  case "sp": return "11101";
  case "fp": return "11110";
  case "ra": return "11111";
  }
  switch(register.charAt(0)) {
  case 'v': return extend((2 + index).toString(2), 5);
  case 'a': return extend((4 + index).toString(2), 5);
  case 't':
    if(index <= 7) return extend((8 + index).toString(2), 5);
    else return extend((24 + index).toString(2), 5);
  case 's': return extend(Number(16 + index).toString(2), 5);
  }
}

function decode() {
  console.log("decode();");
  if(done[0] && !done[1] && !done[2] && !done[3] && !done[4]) {
    done[1] = true;
    ++count;
  }
  var opcode = registers["IF/ID"].slice(0, 6);
  var funcode = registers["IF/ID"].slice(26, 32);
  var offset = signExtend(registers["IF/ID"].slice(16, 32), 32, registers["IF/ID"].charAt(16));
  var jumpaddress = registers["IF/ID"].slice(32, 36) + registers["IF/ID"].slice(6, 32) + "00";
  if (opcode == "000000") { //Rformat
    signals["regDst"] = 1, signals["jump"] = 0, signals["branch"] = 0, signals["memRead"] = 0, signals["memToReg"] = 0, signals["memWrite"] = 0, signals["ALUSrc"] = 0, signals["regWrite"] = 1, signals["wholeW"] = 1, signals["signed"] = 1;
    switch(funcode) {
    case "100000": signals["ALUOp"] = "0010"; break;              //add
    case "100010": signals["ALUOp"] = "0110"; break;              //sub
    case "100111": signals["ALUOp"] = "1100"; break;              //nor
    case "100100": signals["ALUOp"] = "0000"; break;              //and
    case "101010": signals["ALUOp"] = "0111"; break;              //slt
    case "101001": signals["ALUOp"] = "1111", signals["signed"] = 0; break;  //sltu
    case "000000": signals["ALUOp"] = "0100"; break;                          //sll
    case "000010": signals["ALUOp"] = "0101"; break;                          //srl
    case "001000": signals["jump"] = 1; break;                     //jr
    }
  }
  else if(opcode == "001000") { //addi
    signals["ALUOp"] = "0010", signals["regDst"] = 0, signals["jump"] = 0, signals["branch"] = 0, signals["memRead"] = 0, signals["memToReg"] = 0, signals["memWrite"] = 0, signals["ALUSrc"] = 1, signals["regWrite"] = 1, signals["wholeW"] = 1, signals["signed"] = 1;
  }
  else if (opcode == "100011") { //lw
    signals["ALUOp"] = "0010", signals["regDst"] = 0, signals["jump"] = 0, signals["branch"] = 0, signals["memRead"] = 1, signals["memToReg"] = 1, signals["memWrite"] = 0, signals["ALUSrc"] = 1, signals["regWrite"] = 1, signals["wholeW"] = 1, signals["signed"] = 1;

  }
  else if (opcode == "101011") { //sw
    signals["ALUOp"] = "0010", signals["regDst"] = 0, signals["jump"] = 0, signals["branch"] = 0, signals["memRead"] = 0, signals["memToReg"] = 1, signals["memWrite"] = 1, signals["ALUSrc"] = 1, signals["regWrite"] = 0, signals["wholeW"] = 1, signals["signed"] = 1;
  }
  else if (opcode == "000100") { //beq
    signals["ALUOp"] = "0110", signals["regDst"] = 0, signals["jump"] = 0, signals["branch"] = 1, signals["memRead"] = 0, signals["memToReg"] = 0, signals["memWrite"] = 0, signals["ALUSrc"] = 0, signals["regWrite"] = 0, signals["wholeW"] = 0, signals["signed"] = 0;
  }
  else if (opcode == "000101") { //bne
    signals["ALUOp"] = "0110", signals["regDst"] = 0, signals["jump"] = 0, signals["branch"] = 1, signals["memRead"] = 0, signals["memToReg"] = 0, signals["memWrite"] = 0, signals["ALUSrc"] = 0, signals["regWrite"] = 0, signals["wholeW"] = 0, signals["signed"] = 0;
  }
  else if (opcode == "100000") { //lb
    signals["ALUOp"] = "0010", signals["regDst"] = 0, signals["jump"] = 0, signals["branch"] = 0, signals["memRead"] = 1, signals["memToReg"] = 1, signals["memWrite"] = 0, signals["ALUSrc"] = 1, signals["regWrite"] = 1, signals["wholeW"] = 0, signals["signed"] = 1;

  }
  else if (opcode == "100100"){ //lbu
    signals["ALUOp"] = "0010", signals["regDst"] = 0, signals["jump"] = 0, signals["branch"] = 0, signals["memRead"] = 1, signals["memToReg"] = 1, signals["memWrite"] = 0, signals["ALUSrc"] = 1, signals["regWrite"] = 1, signals["wholeW"] = 0, signals["signed"] = 0;

  }
  else if (opcode == "101000") { //sb
    signals["ALUOp"] = "0010", signals["regDst"] = 0, signals["jump"] = 0, signals["branch"] = 0, signals["memRead"] = 0, signals["memToReg"] = 1, signals["memWrite"] = 1, signals["ALUSrc"] = 1, signals["regWrite"] = 0, signals["wholeW"] = 0, signals["signed"] = 1;
  }
  else if (opcode == "000010") { //jump
    signals["ALUOp"] = "1000", signals["regDst"] = 0, signals["jump"] = 1, signals["branch"] = 0, signals["memRead"] = 0, signals["memToReg"] = 0, signals["memWrite"] = 0, signals["ALUSrc"] = 0, signals["regWrite"] = 0, signals["wholeW"] = 0, signals["signed"] = 0;
  }
  else if (opcode == "001111") { // lui
    signals["ALUOp"] = "1000", signals["regDst"] = 0, signals["jump"] = 0, signals["branch"] = 0, signals["memRead"] = 0, signals["memToReg"] = 0, signals["memWrite"] = 0, signals["ALUSrc"] = 1, signals["regWrite"] = 1, signals["wholeW"] = 1, signals["signed"] = 1;
  }
  else if (opcode == "000011") { //jal
    signals["ALUOp"] = "1000", signals["regDst"] = 0, signals["jump"] = 1, signals["branch"] = 0, signals["memRead"] = 0, signals["memToReg"] = 0, signals["memWrite"] = 0, signals["ALUSrc"] = 0, signals["regWrite"] = 0, signals["wholeW"] = 0, signals["signed"] = 0;
  }
  registers["ID/EX"] = registers["IF/ID"].slice(32) + registers[registers["IF/ID"].slice(6, 11)] + registers[registers["IF/ID"].slice(11, 16)]; //pc + reg1 value + reg2 value
  registers["ID/EX"] += offset + registers["IF/ID"].slice(11, 21) + signals["memToReg"] + signals["regWrite"] + signals["memWrite"] + signals["memRead"] + signals["branch"] /*142*/ + signals["ALUOp"] + signals["regDst"] + signals["ALUSrc"] + registers["IF/ID"].slice(21, 26) + signals["wholeW"] + signals["signed"]; // + 32 bits sign-extend  + rt + rd + 2 WB signals bits  + 3 Mem signals bits + 6 EX signals bits + shamt
   // whole word and signed signals total 156 bits
}

function twosComplement(num) {
  return -(~parseInt(num, 2) + 1);
}

function ALU(first, second, opcode, shamt) {
  var f = twosComplement(first);
  var se = twosComplement(second);
  var sh = parseInt(shamt, 2);
  var f1 = parseInt(first,2);
  var se1 =  parseInt(second,2);
  var result;
  switch(opcode) {
  case "0000": result = f & se; break;
  case "0001": result = f | se; break;
  case "0010": result = f + se; break;
  case "0110": signals["Zero"] = f - se == 0 ? 1 : 0; result = f - se; break;
  case "0111": result = f < se ? 1 : 0; break;
  case "1111": result = f1 < se1 ? 1 : 0; break; 
  case "0100": result = f << sh; break;
  case "0101": result = f >>> sh; break;
  case "1000": result = se << 16; break;
  case "1100": result = ~(f | se); break;
  }
  return signExtend((result >>> 0).toString(2), 32, result < 0 ? '1' : '0');
}

function execute() {
  console.log("execute();");
  if(done[0] && done[1] && !done[2] && !done[3] && !done[4]) {
    done[2] = true;
    ++count;
  }
  var offs = (parseInt(registers["ID/EX"].slice(96, 128), 2) >>> 0) << 2;
  var cpc = extend(((parseInt(registers["ID/EX"].slice(0, 32), 2) + offs) >>> 0).toString(2), 32);
  var first = registers["ID/EX"].slice(32, 64);
  var second = registers["ID/EX"].charAt(148) == '1' ? registers["ID/EX"].slice(96, 128) : registers["ID/EX"].slice(64, 96);
  var op = registers["ID/EX"].slice(143, 147);
  var shamt = registers["ID/EX"].slice(149, 154);
  var aluRes = ALU(first, second, op, shamt);
  registers["EX/MEM"] = cpc + signals["Zero"] + aluRes + registers["ID/EX"].slice(64, 96); // branch address + zero bit + aluresult + data to write
  registers["EX/MEM"] += registers["ID/EX"].charAt(147) == '1' ? registers["ID/EX"].slice(133, 138) : registers["ID/EX"].slice(128, 133); //5 bits destination register
  registers["EX/MEM"] += registers["ID/EX"].slice(138, 143) + registers["ID/EX"].slice(154); //2 WB signals bits  + 3 Mem signals bits + signed and whole word signals total 109 bits
}

function memory() {
  console.log("memory();");
  if(done[0] && done[1] && done[2] && !done[3] && !done[4]) {
    done[3] = true;
    ++count;
  }
  var memWrite = registers["EX/MEM"].charAt(104);
  var memRead = registers["EX/MEM"].charAt(105);
  var index = parseInt(registers["EX/MEM"].slice(33, 65), 2) >>> 2;
  var read = extend("", 32);
  var wholeWord = registers["EX/MEM"].charAt(107);
  var signed = registers["EX/MEM"].charAt(108);
  if(registers["EX/MEM"].charAt(106) == '1' && registers["EX/MEM"].charAt(32) == '1') {
    //pc = registers["EX/MEM"].slice(0, 32);
  }
  if(memWrite == '1') {
    if(wholeWord == '1') {
      mem[index] = registers["EX/MEM"].slice(65, 97);
    }
    else{
      mem[index] = signExtend((registers["EX/MEM"].slice(65, 97)).slice(24),32,(registers["EX/MEM"].slice(65, 97)).charAt(0));
    }
  }
  if(memRead == '1') {
    if(wholeWord == '1') {
      read = mem[index];
  }
  else if (signed == '0'){
    read = extend(mem[index].slice(24), 32);
  }
  else {
    read = signExtend(mem[index].slice(24), 32, mem[index].slice(24).charAt(0));
  }
  }
  registers["MEM/WB"] = registers["EX/MEM"].slice(33, 65) + read + registers["EX/MEM"].slice(97, 102); //Alures + memReadWord + destinationReg
  registers["MEM/WB"] += registers["EX/MEM"].slice(102, 104); //2 WB signals bits total 71 bits
}

function write() {
  console.log("write();");
  if(done[0] && done[1] && done[2] && done[3] && !done[4]) {
    done[4] = true;
    ++count;
  }
  var regWrite = registers["MEM/WB"].charAt(70);
  var memToReg = registers["MEM/WB"].charAt(69);
  var dest = registers["MEM/WB"].slice(64, 69);
  if(regWrite == '1') {
    if(memToReg == '0') registers[dest] = registers["MEM/WB"].slice(0, 32);
    else registers[dest] = registers["MEM/WB"].slice(32, 64);
  }
}

function generateGUI() {
  $("#registers #first, #registers #second, #signals, #pipeline, #memory .row .columns").html("");
  for(var i = 0; i < registerNames.length / 2; ++i) {
    $("#registers #first").append("<div class=\"row collapse\">\
  <div class=\"columns small-2\"><span class=\"prefix\">" + registerNames[i] + "</span></div>\
  <div class=\"columns small-3\"><input id=\"" + registerNames[i] + "Val\" type=\"text\" disabled value=\"" + twosComplement(registers[extend((i).toString(2), 5)]) + "\"></div>\
  <div class=\"columns small-7\"><input id=\"" + registerNames[i] + "\" type=\"text\" disabled value=\"" + registers[extend((i).toString(2), 5)] + "\"></div>\
</div>\
    ");
  }
  for(var i = registerNames.length / 2; i < registerNames.length; ++i) {
    $("#registers #second").append("<div class=\"row collapse\">\
  <div class=\"columns small-2\"><span class=\"prefix\">" + registerNames[i] + "</span></div>\
  <div class=\"columns small-3\"><input id=\"" + registerNames[i] + "Val\" type=\"text\" disabled value=\"" + twosComplement(registers[extend((i).toString(2), 5)]) + "\"></div>\
  <div class=\"columns small-7\"><input id=\"" + registerNames[i] + "\" type=\"text\" disabled value=\"" + registers[extend((i).toString(2), 5)] + "\"></div>\
</div>\
    ");
  }
  for(var i = 0; i < signalNames.length; ++i) {
    $("#signals").append("<div class=\"columns small-3 medium-2\"><input id=\"" + signalNames[i] + "\" type=\"text\" disabled value=\"" + signalNames[i] + " = " + signals[signalNames[i]] + "\"></div>");
  }
  $("#pc").val(pc);
  $("#pcVal").val(parseInt(pc, 2));
  for(var i = 0; i < signalNames.length; ++i) {
    $("#" + signalNames[i]).val(signalNames[i] + " = " + signals[signalNames[i]]);
  }
  $("#pipeline").append("<div class=\"columns small-12 medium-8\"><input id=\"IFID\" type=\"text\" value=\"" + registers["IF/ID"] + "\" disabled></div>");
  $("#pipeline").append("<div class=\"columns small-12 medium-8\"><input id=\"IDEX\" type=\"text\" value=\"" + registers["ID/EX"] + "\" disabled></div>");
  $("#pipeline").append("<div class=\"columns small-12 medium-8\"><input id=\"EXMEM\" type=\"text\" value=\"" + registers["EX/MEM"] + "\" disabled></div>");
  $("#pipeline").append("<div class=\"columns small-12 medium-8\"><input id=\"MEMWB\" type=\"text\" value=\"" + registers["MEM/WB"] + "\" disabled></div>");
  for(var i = org; i < org + dataBegin; ++i) $("#memory .row .columns.first").append("<input type=\"text\" value=\"" + mem[i] + "\" disabled>");
  for(var i = org + dataBegin; i < org + stackBegin - dataBegin + 1; ++i) $("#memory .row .columns.second").append("<input type=\"text\" value=\"" + mem[i] + "\" disabled>");
  for(var i = org + stackBegin - dataBegin + 1; i < org + stackBegin + 1; ++i) $("#memory .row .columns.third").append("<input type=\"text\" value=\"" + mem[i] + "\" disabled>");
  $("#memory").append("<a class=\"close-reveal-modal\" aria-label=\"Close\">&#215;</a>");
  $("#cycles").val(count);
}

function updateGUI() {
  for(var i = 0; i < registerNames.length; ++i) {
    $("#" + registerNames[i]).val(registers[extend((i).toString(2), 5)]);
    $("#" + registerNames[i] + "Val").val(twosComplement(registers[extend((i).toString(2), 5)]));
  }
  $("#pc").val(pc);
  $("#pcVal").val(parseInt(pc, 2));
  for(var i = 0; i < signalNames.length; ++i) {
    $("#" + signalNames[i]).val(signalNames[i] + " = " + signals[signalNames[i]]);
  }
  $("#pipeline #IFID").val(registers["IF/ID"]);
  $("#pipeline #IDEX").val(registers["ID/EX"]);
  $("#pipeline #EXMEM").val(registers["EX/MEM"]);
  $("#pipeline #MEMWB").val(registers["MEM/WB"]);
  for(var i = org; i < org + dataBegin; ++i) $("#memory .row .columns.first input")[i - org].value = mem[i];
  for(var i = org + dataBegin; i < org + stackBegin - dataBegin + 1; ++i) $("#memory .row .columns.second input")[i - org - dataBegin].value = mem[i];
  for(var i = org + stackBegin - dataBegin + 1; i < org + stackBegin + 1; ++i) $("#memory .row .columns.third input")[i - org - stackBegin + dataBegin - 1].value = mem[i];
  $("#cycles").val(count);
}
 
function compile() {
  parseCode();
  updateGUI();
  $("#compile").attr("disabled", true);
  $("#run, #step").attr("disabled", false);
}

function performStep() {
  registers["00000"] = extend("", 32);
  if(!done[4]) write();
  registers["00000"] = extend("", 32);
  if(!done[3]) memory();
  registers["00000"] = extend("", 32);
  if(!done[2]) execute();
  registers["00000"] = extend("", 32);
  if(!done[1]) decode();
  registers["00000"] = extend("", 32);
  if(!done[0]) fetch();
  registers["00000"] = extend("", 32);
  $("#cycles").val(count);
}

function run() {
  while(!done[4]) performStep();
  $("#compile").attr("disabled", false);
  $("#run, #step").attr("disabled", true);
  updateGUI();
}

function step() {
  if(!done[4]) performStep();
  if(done[4]) {
    $("#compile").attr("disabled", false);
    $("#run, #step").attr("disabled", true);
  }
  updateGUI();
}
