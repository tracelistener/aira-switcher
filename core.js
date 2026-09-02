/* Original utility code. No Roland firmware is included. */
(function (root) {
  'use strict';
  const MODELS = Object.freeze({1:'Bitrazer', 2:'Demora', 3:'Torcido', 4:'Scooper'});
  const SIZE = 0x200000, BEGIN = 0x140000, END = 0x142000;
  const INFO = '0000,0495,4096\r\n';
  const KNOWN = Object.freeze({
    boot:'F22FC2B7A4A4E455CA24F29C110A79CEFC100CD12839D4A4DA33438F170DBA48',
    updater:'39E48A82D7FDE0CB948FA9F5C6C241ED5D8FFC415E5BF2766AF947426CB8A634',
    app493:'7E34B9AED14B29E1DC3F683D3690A44FE4747B97BDB6D297B30DAD0514B650FA',
    app491:'EA703056406F2C9A5E8A554DC423FD0059416A84C3D75310B9A3551EBC4742C4'
  });
  const encoder = new TextEncoder();
  const hex = n => '0x' + n.toString(16).toUpperCase().padStart(6,'0');
  const ascii = b => Array.from(b, n => String.fromCharCode(n)).join('');
  const equal = (a,b) => a.length === b.length && a.every((v,i) => v === b[i]);
  function u32(b,o) { return new DataView(b.buffer,b.byteOffset,b.byteLength).getUint32(o,true); }
  async function hash(bytes) {
    if (!root.crypto?.subtle) throw new Error('SHA-256 unavailable. Open in a modern browser over HTTPS, localhost, or a supported local-file context.');
    const digest = new Uint8Array(await root.crypto.subtle.digest('SHA-256', bytes));
    return Array.from(digest, n => n.toString(16).padStart(2,'0')).join('').toUpperCase();
  }
  function unpack(source,size) {
    if (!Number.isInteger(size) || size < 1 || size > SIZE) throw new Error('Invalid decompressed size.');
    const ring = new Uint8Array(4096), out = new Uint8Array(size);
    let pos=0, written=0, ringPos=0xFEE, flags=0;
    function byte() { if(pos >= source.length) throw new Error('Truncated compressed record.'); return source[pos++]; }
    while(written<size) {
      flags >>>= 1;
      if (!(flags & 0x100)) flags = byte() | 0xFF00;
      if(flags & 1) { const v=byte(); out[written++]=v; ring[ringPos]=v; ringPos=(ringPos+1)&4095; }
      else {
        const lo=byte(), hi=byte(), start=lo|((hi&0xF0)<<4), count=(hi&15)+3;
        for(let j=0;j<count && written<size;j++) {
          const v=ring[(start+j)&4095]; out[written++]=v; ring[ringPos]=v; ringPos=(ringPos+1)&4095;
        }
      }
    }
    if(pos!==source.length) throw new Error('Compressed record has unexpected trailing bytes.');
    return out;
  }
  async function codeRecord(bytes,offset,limit,signature) {
    if(ascii(bytes.subarray(offset,offset+16))!==signature) throw new Error('Missing code signature at '+hex(offset));
    const load=u32(bytes,offset+0x28), delta=u32(bytes,offset+0x2C), size=u32(bytes,offset+0x30);
    const sum=u32(bytes,offset+0x34), entry=u32(bytes,offset+0x38), expanded=u32(bytes,offset+0x3C);
    if(delta!==64 || size<1 || offset+delta+size>limit) throw new Error('Invalid code record boundaries.');
    if(load!==0x60000000 || entry!==0x60000000) throw new Error('Unrecognized execution addresses.');
    const packed=bytes.subarray(offset+delta,offset+delta+size);
    const actual=packed.reduce((a,b)=>(a+b)>>>0,0);
    if(actual!==sum) throw new Error('Code checksum mismatch at '+hex(offset));
    return {offset:hex(offset),build:ascii(bytes.subarray(offset+16,offset+40)),
      compressedSize:size,decompressedSize:expanded,sha256:await hash(unpack(packed,expanded))};
  }
  function productRecords(bytes) {
    const records=[];
    for(let offset=BEGIN;offset<END;offset+=256) {
      const slot=bytes.subarray(offset,offset+256);
      if(slot.every(v=>v===255)) continue;
      if(ascii(slot.subarray(0,8))!=='AIRA_FX ' || !equal(slot.subarray(0,16),slot.subarray(240,256)))
        throw new Error('Incomplete or unrecognized Product slot at '+hex(offset));
      if(slot[12]!==2 || slot[13]!==0 || slot[14]!==1 || slot[15]!==0)
        throw new Error('Unrecognized Product metadata at '+hex(offset));
      const sequence=u32(slot,8), value=u32(slot,16);
      if(!sequence || sequence>=0x80000000 || !MODELS[value]) throw new Error('Ambiguous Product sequence/value.');
      if(!slot.subarray(20,56).every(v=>v===0) || !slot.subarray(56,240).every(v=>v===255))
        throw new Error('Product payload differs from the validated layout.');
      records.push({offset,offsetHex:hex(offset),sequence,value,model:MODELS[value]});
    }
    // Multiple-record selection and wraparound need independent validation.
    if(records.length!==1) throw new Error('Expected one valid Product record; multi-record histories are inspection-only.');
    return records;
  }
  async function inspect(input,infoText) {
    const bytes=new Uint8Array(input); // Own copy, never mutate caller data.
    const report={toolVersion:'0.1.0',size:bytes.length,sha256:await hash(bytes),switchable:false,reasons:[],records:[]};
    if(bytes.length!==SIZE) {
      report.reasons.push('Requires a 2 MiB full-ROM backup, not an updater download or USERAREA.BIN.'); return report;
    }
    try {report.updater=await codeRecord(bytes,0x2000,0x40000,'AIRA-FX:Updater ');} catch(e){report.reasons.push(e.message);}
    try {report.application=await codeRecord(bytes,0x40000,BEGIN,'AIRA-FX:Appli   ');} catch(e){report.reasons.push(e.message);}
    report.bootSha256=await hash(bytes.subarray(0,8192));
    try {report.records=productRecords(bytes); report.currentModel=report.records[0].model; report.currentProduct=report.records[0].value;}
    catch(e){report.reasons.push(e.message);}
    if(report.bootSha256!==KNOWN.boot) report.reasons.push('Boot code has not been validated.');
    if(report.updater?.sha256!==KNOWN.updater) report.reasons.push('Updater code has not been validated.');
    report.firmwareBuild=report.application?.sha256===KNOWN.app491?'0491':report.application?.sha256===KNOWN.app493?'0493':null;
    if(!report.firmwareBuild) report.reasons.push('Application code has not been validated.');
    report.warnings=[];
    if(infoText!==INFO) report.reasons.push('Select the original ROMINFO.TXT: expected native range 0000,0495,4096 with CRLF. No range is guessed.');
    report.switchable=report.reasons.length===0;
    report.evidence='All four personalities tested on one Scooper, build 0493. Build 0491 reported working by the project owner. Other physical units are not independently validated.';
    report.restoreRange={start:'0x000000',endExclusive:'0x1F0000',sectors:496,includesBootCode:true};
    return report;
  }
  async function prepare(input,infoText,target) {
    if(!Number.isInteger(target) || !MODELS[target]) throw new Error('Choose a valid target personality.');
    const original=new Uint8Array(input), before=await inspect(original,infoText);
    if(!before.switchable) throw new Error(before.reasons.join(' '));
    if(before.currentProduct===target) throw new Error('This backup already has the selected personality.');
    const candidate=original.slice(), offset=before.records[0].offset+16;
    new DataView(candidate.buffer).setUint32(offset,target,true);
    let changed=0;
    for(let i=0;i<SIZE;i++) if(original[i]!==candidate[i]) {if(i!==offset) throw new Error('Unexpected changed byte.'); changed++;}
    if(changed!==1) throw new Error('Expected exactly one changed byte.');
    const after=await inspect(candidate,infoText);
    if(!after.switchable || after.currentProduct!==target) throw new Error('Candidate failed reinspection.');
    return {original,candidate,manifest:{toolVersion:'0.1.0',from:before.currentModel,to:MODELS[target],
      sourceSha256:before.sha256,candidateSha256:after.sha256,changedBytes:1,offset:hex(offset),
      oldValue:before.currentProduct,newValue:target,restoreRange:before.restoreRange,firmwareBuild:before.firmwareBuild,validationWarnings:before.warnings,
      warning:'Experimental; rewrites boot code. Same physical unit only. Preserves supplied patch data; does not initialize defaults. Recovery after a failure is not guaranteed.'}};
  }
  function crc32(bytes) {
    let crc=0xFFFFFFFF;
    for(const b of bytes) {crc^=b;for(let j=0;j<8;j++) crc=(crc>>>1)^((crc&1)?0xEDB88320:0);}
    return (crc^0xFFFFFFFF)>>>0;
  }
  function join(parts) {const out=new Uint8Array(parts.reduce((n,p)=>n+p.length,0));let pos=0;for(const p of parts){out.set(p,pos);pos+=p.length;}return out;}
  function header(size) {const b=new Uint8Array(size),v=new DataView(b.buffer);return {b,w:(o,n)=>v.setUint16(o,n,true),d:(o,n)=>v.setUint32(o,n,true)};}
  function zip(entries) {
    const locals=[],central=[];let pos=0;
    for(const [path,content] of entries) {
      if(!/^[A-Za-z0-9_.\/-]+$/.test(path) || path.includes('..') || path.startsWith('/')) throw new Error('Unsafe archive path.');
      const name=encoder.encode(path),data=typeof content==='string'?encoder.encode(content):content,crc=crc32(data);
      const h=header(30);h.d(0,0x04034B50);h.w(4,20);h.w(12,33);h.d(14,crc);h.d(18,data.length);h.d(22,data.length);h.w(26,name.length);
      locals.push(h.b,name,data);
      const c=header(46);c.d(0,0x02014B50);c.w(4,20);c.w(6,20);c.w(14,33);c.d(16,crc);c.d(20,data.length);c.d(24,data.length);c.w(28,name.length);c.d(42,pos);
      central.push(c.b,name);pos+=30+name.length+data.length;
    }
    const directory=join(central),end=header(22);end.d(0,0x06054B50);end.w(8,entries.length);end.w(10,entries.length);end.d(12,directory.length);end.d(16,pos);
    return join([...locals,directory,end.b]);
  }
  function archive(result) {
    const note=`AIRA personality switch — experimental\r\nTarget: ${result.manifest.to}\r\n\r\nKeep this archive and your untouched backup. Same physical unit only.\r\nUnzip on the computer, not on AIRAMODULAR.\r\nCopy ONLY the two files INSIDE install/ to the updater drive root.\r\nNever copy install/ and recovery/ together or the ZIP itself.\r\nSafely eject before unplugging USB. Use stable power.\r\nThis restores 496 sectors, including boot code. Power loss can require hardware repair.\r\nIf expected updater indicators differ, stop; do not repeatedly press buttons.\r\nAfter normal reboot, verify identity, then initialize the selected model in Customizer if needed.\r\nrecovery/ contains the exact input ROM, not a guaranteed recovery from boot failure.\r\nFirmware version and saved patches are NOT changed to factory defaults.\r\nSource SHA256: ${result.manifest.sourceSha256}\r\nTarget SHA256: ${result.manifest.candidateSha256}\r\n`;
    const validationNote='Firmware build: '+result.manifest.firmwareBuild+'\r\n'+(result.manifest.validationWarnings||[]).join('\r\n')+'\r\n\r\n';
    return zip([['install/AIRA_MODULAR_ROM.BIN',result.candidate],['install/ROMINFO.TXT',INFO],
      ['recovery/AIRA_MODULAR_ROM.BIN',result.original],['recovery/ROMINFO.TXT',INFO],
      ['manifest.json',JSON.stringify(result.manifest,null,2)+'\n'],['READ-ME-FIRST.txt',validationNote+note]]);
  }
  const api=Object.freeze({MODELS,INFO,KNOWN,hash,unpack,inspect,prepare,archive,zip,crc32});
  if(typeof module!=='undefined' && module.exports) module.exports=api;
  else root.Aira=api;
})(globalThis);
