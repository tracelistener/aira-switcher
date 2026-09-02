'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
globalThis.crypto ||= require('node:crypto').webcrypto;
const A=require('./core.js');
let checks=0;
function ok(value,message){assert.ok(value,message);checks++;}
async function rejected(fn,pattern){await assert.rejects(fn,pattern);checks++;}
async function main(){
  ok(A.crc32(new TextEncoder().encode('123456789'))===0xCBF43926,'ZIP CRC standard vector');
  assert.deepEqual([...A.unpack(new Uint8Array([7,65,66,67]),3)],[65,66,67]);checks++;
  assert.throws(()=>A.unpack(new Uint8Array([1]),2),/Truncated/);checks++;
  assert.throws(()=>A.unpack(new Uint8Array([1,65,99]),1),/trailing/);checks++;
  assert.throws(()=>A.zip([['../bad','x']]),/Unsafe/);checks++;
  const unknown=await A.inspect(new Uint8Array(2097152),A.INFO);
  ok(!unknown.switchable && unknown.reasons.length>0,'Unknown ROM blocked');
  const updater=await A.inspect(new Uint8Array(2097168),A.INFO);
  ok(!updater.switchable && updater.reasons[0].includes('full-ROM'),'Updater-sized file blocked');
  await rejected(()=>A.prepare(new Uint8Array(2097152),A.INFO,7),/valid target/);
  let packageBytes=A.zip([['a.txt','hello'],['b/data.bin',new Uint8Array([0,255,2])]]);
  const fixtureRoot=process.argv[2];
  if(fixtureRoot){
    const file=name=>fs.readFileSync(path.join(fixtureRoot,name,'AIRA_MODULAR_ROM.BIN'));
    const source=file('scooper-full-rom-backup-build0493-2026-09-02');
    const before=await A.hash(source);
    const result=await A.inspect(source,A.INFO);
    ok(result.switchable && result.currentProduct===4,'Original inspected');
    for(const [target,name] of [[1,'bitrazer'],[2,'demora'],[3,'torcido']]){
      const built=await A.prepare(source,A.INFO,target);
      const captured=file(name+'-rom-after-personality-change-2026-09-02');
      ok(Buffer.from(built.candidate).equals(captured),name+' equals hardware readback');
      const reverse=await A.prepare(captured,A.INFO,4);
      ok(Buffer.from(reverse.candidate).equals(source),name+' returns original bytes');
      ok(built.manifest.changedBytes===1,'One-byte diff');
      if(target===3)packageBytes=A.archive(built);
    }
    ok(await A.hash(source)===before,'Source never mutated');
    const settingsChanged=Uint8Array.from(source);settingsChanged[0x160000]^=1;settingsChanged[0x1F1000]^=1;
    const preserved=await A.prepare(settingsChanged,A.INFO,2);
    ok(preserved.candidate[0x160000]===settingsChanged[0x160000] && preserved.candidate[0x1F1000]===settingsChanged[0x1F1000],'Unit-specific data preserved; no whole-ROM hash lock');
    await rejected(()=>A.prepare(source,A.INFO,4),/already/);
    await rejected(()=>A.prepare(source,'0320,0320,4096\r\n',2),/ROMINFO/);
    await rejected(()=>A.prepare(source,'0000,0495,4096\n',2),/ROMINFO/);
    const corrupt=Uint8Array.from(source);corrupt[0x40040]^=1;
    ok(!(await A.inspect(corrupt,A.INFO)).switchable,'Corrupt checksum blocked');
    const otherCode=Uint8Array.from(source);otherCode[0]^=1;
    ok(!(await A.inspect(otherCode,A.INFO)).switchable,'Unknown boot code blocked');
    const header=Uint8Array.from(source);header[0x1400F0]^=1;
    ok(!(await A.inspect(header,A.INFO)).switchable,'Broken record trailer blocked');
    const history=Uint8Array.from(source);history.set(source.subarray(0x140000,0x140100),0x140100);
    ok(!(await A.inspect(history,A.INFO)).switchable,'Ambiguous history blocked');
    const moved=Uint8Array.from(source);moved.fill(255,0x140000,0x140100);moved.set(source.subarray(0x140000,0x140100),0x141000);
    const movedResult=await A.prepare(moved,A.INFO,1);
    ok(movedResult.manifest.offset==='0x141010','Validated single record need not occupy first slot');
    if(process.argv[3]){
      // Synthetic fixture only: no claim of a captured or flashed 0491 ROM.
      const official491=fs.readFileSync(process.argv[3]);
      ok(await A.hash(official491)==='FD1DE67DA2A7123B9A672E4DA012AC7CF355D10974CD9B704A9E738293B030E2','Exact official 0491 input');
      const synthetic=Uint8Array.from(source);
      synthetic.set(official491.subarray(0x40000,0x100000),0x40000);
      const r491=await A.inspect(synthetic,A.INFO);
      ok(r491.switchable && r491.firmwareBuild==='0491' && r491.warnings.length===0 && r491.evidence.includes('reported working'),'0491 supported with attributed owner report');
      const expand=(b,o)=>{const v=new DataView(b.buffer,b.byteOffset,b.byteLength);return A.unpack(b.subarray(o+64,o+64+v.getUint32(o+48,true)),v.getUint32(o+60,true));};
      ok(Buffer.from(expand(official491,0x2000)).equals(Buffer.from(expand(source,0x2000))),'0491 updater identical to captured 0493 updater');
      ok(Buffer.from(expand(official491,0x40000).subarray(0xd7d6,0xd8b0)).equals(Buffer.from(expand(source,0x40000).subarray(0xd7d6,0xd8b0))),'Product getter/setter implementation identical');
      for(const target of [1,2,3]){
        const prepared=await A.prepare(synthetic,A.INFO,target);
        ok(prepared.manifest.firmwareBuild==='0491' && prepared.manifest.validationWarnings.length===0,'0491 build retained in manifest');
        ok(Buffer.from(prepared.candidate.subarray(0,0x140000)).equals(Buffer.from(synthetic.subarray(0,0x140000))),'0491 code preserved');
        ok(Buffer.from((await A.prepare(prepared.candidate,A.INFO,4)).candidate).equals(Buffer.from(synthetic)),'0491 reverse conversion exact');
        packageBytes=A.archive(prepared);
      }
      const damaged=Uint8Array.from(synthetic);damaged[0x40040]^=1;
      ok(!(await A.inspect(damaged,A.INFO)).switchable,'Corrupt 0491 blocked');
      const wrongBoot=Uint8Array.from(synthetic);wrongBoot[0]^=1;
      ok(!(await A.inspect(wrongBoot,A.INFO)).switchable,'Unknown 0491 boot blocked');
      await rejected(()=>A.prepare(synthetic,'0320,0320,4096\r\n',2),/ROMINFO/);
    }
  } else console.log('No private fixture directory supplied: real-ROM integration tests skipped.');
  // Independent ZIP implementation validates central directory, CRCs and contents.
  const script="import io,sys,zipfile,json; z=zipfile.ZipFile(io.BytesIO(sys.stdin.buffer.read())); assert z.testzip() is None; names=z.namelist(); assert len(names)==len(set(names));\nif 'manifest.json' in names:\n m=json.loads(z.read('manifest.json')); a=z.read('install/AIRA_MODULAR_ROM.BIN'); b=z.read('recovery/AIRA_MODULAR_ROM.BIN'); assert len(a)==2097152 and len(b)==2097152; assert sum(x!=y for x,y in zip(a,b))==1; assert z.read('install/ROMINFO.TXT')==b'0000,0495,4096\\r\\n'; import hashlib; assert hashlib.sha256(a).hexdigest().upper()==m['candidateSha256']; assert hashlib.sha256(b).hexdigest().upper()==m['sourceSha256']\nprint('Independent ZIP extraction and CRC check passed')";
  console.log(execFileSync(process.env.PYTHON||'python',['-c',script],{input:packageBytes,encoding:'utf8'}).trim());checks++;
  const app=fs.readFileSync(path.join(__dirname,'app.js'),'utf8'),html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
  ok(!/\b(fetch|XMLHttpRequest|WebSocket|showDirectoryPicker|requestMIDIAccess)\b/.test(app),'No network or device write APIs');
  ok(html.includes("connect-src 'none'") && html.includes('aria-live="polite"'),'CSP and accessible status');
  const referenced=[...app.matchAll(/el\('([^']+)'\)/g)].map(x=>x[1]);
  ok(referenced.every(id=>html.includes('id="'+id+'"')),'UI element references exist');
  console.log(checks+' checks passed.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
