/* Run with: node tests/variant.test.cjs (Node 18+; no packages needed). */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const context = vm.createContext({});
for (const file of ['variant.js','questions.js']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'), context);
}
const {modStar, calculate, parameters} = context.Variant;
const plain = value => JSON.parse(JSON.stringify(value));
const expected = (a,b) => a%b || b;
assert.deepEqual(plain(calculate(49)), {1:[3,15],2:[4,9],3:[7],4:[1]});
for (const [a,b,want] of [[15,2,1],[15,3,3],[15,4,3],[15,5,5],[3,7,3]]) assert.equal(modStar(a,b),want);
for (const bad of [0,-1,101,1.5,NaN,Infinity,'49',null]) assert.throws(()=>calculate(bad));
for (const [a,b] of [[0,3],[1,0],[-1,3],[1.1,2],[1,2.2]]) assert.throws(()=>modStar(a,b));
const multiply = (a,b) => a.map(row => b[0].map((_,j)=>row.reduce((sum,x,i)=>sum+x*b[i][j],0)));
const close = (a,b) => assert.ok(Math.abs(a-b)<1e-9, `${a} != ${b}`);
for (let k=1;k<=100;k++) {
  const out=plain(calculate(k)), p=parameters(k);
  assert.deepEqual(out,{1:[expected(k,23),expected(k+12,23)],2:[expected(k,9),expected(k+5,9)],3:[expected(k,7)],4:[expected(k,4)]});
  for (const l of [1,2,3,4]) assert.equal(new Set(out[l]).size,out[l].length);
  assert.equal(p.a,expected(k,10)); assert.equal(p.b,expected(k,11));
  assert.equal(p.r,expected(k,3)); assert.equal(p.s,expected(k,2)+1); assert.equal(p.t,expected(k,8));
  // N2.3: real and imaginary parts of (a+bi)^2 - 2a(a+bi) + a^2+b^2.
  close(p.a*p.a-p.b*p.b-2*p.a*p.a+p.a*p.a+p.b*p.b,0);
  close(2*p.a*p.b-2*p.a*p.b,0);
  // N2.4: z^m = conjugate(z).
  const theta=2*Math.PI/(p.m8+1);
  close(Math.cos(p.m8*theta),Math.cos(theta)); close(Math.sin(p.m8*theta),-Math.sin(theta));
  // N2.5: a consistent right-hand side, but the second violates a row relation.
  const A=[[p.p+1,1,p.p+2],[p.p,0,p.p],[p.p-1,2,p.p+1]];
  assert.deepEqual(multiply(A,[[1],[0],[0]]).flat(),[p.p+1,p.p,p.p-1]);
  for(let j=0;j<3;j++) close(2*p.p*A[0][j]-(p.p+3)*A[1][j]-p.p*A[2][j],0);
  assert.notEqual(2*p.p*(p.q-1)-(p.p+3)*p.q-p.p*(p.q+1),0);
  for(let i=0;i<3;i++) for(let j=i+1;j<3;j++) {
    assert.ok([0,1,2].some(s=>[0,1,2].some(t=>A[i][s]*A[j][t]!==A[i][t]*A[j][s])));
  }
  // N2.6: both products with the proposed inverse are identity.
  const [a,b,c]=p.row, M=[[a,b,c],[0,1,0],[0,0,1]], N=[[1/a,-b/a,-c/a],[0,1,0],[0,0,1]];
  for(const product of [multiply(M,N),multiply(N,M)]) product.forEach((r,i)=>r.forEach((v,j)=>close(v,i===j?1:0)));
  // N2.7: exactly m+2 elementary factors give the displayed matrix.
  const T=[[1,1,0],[0,1,0],[0,0,1]], P=[[0,1,0],[1,0,0],[0,0,1]], D=[[2,0,0],[0,1,0],[0,0,1]];
  let product=[[1,0,0],[0,1,0],[0,0,1]];
  for(let i=0;i<p.p4;i++) product=multiply(product,T);
  assert.deepEqual(multiply(multiply(product,P),D),[[2*p.p4,1,0],[2,0,0],[0,0,1]]);
  assert.equal(p.factors,p.p4+2);
  // N2.8: shapes, nonzero distinct elements and exact target cell (within rounding).
  const B=[[1,2],[3,4]], C=[[1,2,3],[4,5,6]], BC=multiply(B,C), F=[[10,11],[20,21],[30,31]];
  F[p.r-1][1]=(p.t-10*p.r*BC[0][p.s-1])/BC[1][p.s-1];
  for (const matrix of [F,B,C]) {assert.ok(matrix.flat().every(x=>x!==0)); assert.equal(new Set(matrix.flat()).size,matrix.flat().length);}
  close(multiply(multiply(F,B),C)[p.r-1][p.s-1],p.t);
  // N2.9: noncollinear pairs, distinct coefficient lists, same resulting vector.
  const vectors=Array.from({length:p.vectors},(_,i)=>[1,i+1]);
  for(let i=0;i<vectors.length;i++) for(let j=i+1;j<vectors.length;j++) assert.notEqual(vectors[j][1]-vectors[i][1],0);
  const combinations=[];
  for(let l=0;l<p.combinations;l++) {
    const co=[1+l,-2*l,l,...(p.vectors===4?[0]:[])]; combinations.push(JSON.stringify(co));
    assert.deepEqual([0,1].map(j=>co.reduce((sum,x,i)=>sum+x*vectors[i][j],0)),[1,1]);
  }
  assert.equal(new Set(combinations).size,p.combinations);
}
assert.equal(context.QUESTION_BANK.length,43);
for (const [level,total] of [[1,23],[2,9],[3,7],[4,4]]) {
  const rows=context.QUESTION_BANK.filter(q=>q.level===level);
  assert.equal(rows.length,total);
  assert.deepEqual(plain(rows.map(q=>q.number)),Array.from({length:total},(_,i)=>i+1));
  assert.ok(rows.every(q=>q.title && q.skeleton));
  if(level>=2) assert.ok(rows.every(q=>q.answer));
}
const report='PASS: all 100 variants, mod* boundaries, invalid input, 43 questions and Nivel 2 constructions.';
console.log(report);
module.exports=report;
