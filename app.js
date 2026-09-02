'use strict';
const el=id=>document.getElementById(id);
let source=null,metadata=null,report=null,busy=false,generation=0;
function message(id,text){el(id).textContent=text;}
function reset(){generation++;source=null;metadata=null;report=null;busy=false;el('results').hidden=true;el('choose-step').hidden=true;el('download-step').hidden=true;el('install-help').open=false;el('targets').disabled=true;el('risk').checked=false;el('risk').disabled=true;el('download').disabled=true;document.querySelectorAll('[name=target]').forEach(x=>{x.checked=false;x.disabled=false;});message('status','Select both backup files to continue.');message('package-status','Your original backup is included for recovery. This tool does not flash the unit.');}
function sync(){const selected=document.querySelector('[name=target]:checked');el('download').disabled=busy||!report?.switchable||!selected||!el('risk').checked;}
function save(name,bytes,type){const url=URL.createObjectURL(new Blob([bytes],{type}));const link=document.createElement('a');link.href=url;link.download=name;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
function filesChanged(){reset();if(el('rom').files[0]&&el('info').files[0])inspectFiles();}
el('rom').addEventListener('change',filesChanged);el('info').addEventListener('change',filesChanged);
el('clear').addEventListener('click',()=>{el('rom').value='';el('info').value='';reset();});
el('risk').addEventListener('change',sync);el('targets').addEventListener('change',()=>{el('risk').checked=false;el('download-step').hidden=false;el('install-help').open=false;const target=document.querySelector('[name=target]:checked');message('download','Download '+Aira.MODELS[Number(target.value)]+' ZIP');message('package-status','Original backup included for recovery. Nothing is flashed automatically.');sync();});
async function inspectFiles(){
  reset();const ticket=generation;busy=true;message('status','Checking your backup…');
  try{
    const rom=el('rom').files[0],info=el('info').files[0];
    if(!rom)throw new Error('Select a full-ROM backup.');
    if(rom.size>2097168)throw new Error('File exceeds the supported 2 MiB ROM size.');
    if(info && info.size>128)throw new Error('ROMINFO.TXT is unexpectedly large.');
    const bytes=new Uint8Array(await rom.arrayBuffer()),text=info?await info.text():'';
    const result=await Aira.inspect(bytes,text);
    if(ticket!==generation)return;
    source=bytes;metadata=text;report=result;
    el('results').hidden=false;message('current',report.currentModel||'Unrecognized');
    message('build',report.application?.build||'Unrecognized');message('compat',report.switchable?'Validated code/layout · experimental':'Inspection only');
    message('report',JSON.stringify(report,null,2));el('targets').disabled=!report.switchable;el('risk').disabled=!report.switchable;
    el('choose-step').hidden=!report.switchable;
    document.querySelectorAll('[name=target]').forEach(x=>{x.disabled=Number(x.value)===report.currentProduct;});
    message('status',report.switchable?'Backup checked. Choose a model below.':report.reasons.join(' '));
    message('package-status',report.switchable?'No files prepared or written to the device.':'Download disabled: compatibility checks did not pass.');
  }catch(e){if(ticket===generation)message('status',e.message);}
  finally{if(ticket===generation){busy=false;sync();}}
}
el('report-download').addEventListener('click',()=>{if(report)save('aira-inspection.json',JSON.stringify(report,null,2),'application/json');});
el('download').addEventListener('click',async()=>{
  if(el('download').disabled)return;
  const target=Number(document.querySelector('[name=target]:checked').value),ticket=generation;
  busy=true;sync();el('targets').disabled=true;message('package-status','Revalidating input and candidate…');
  try{
    const result=await Aira.prepare(source,metadata,target);
    if(ticket!==generation)return;
    const bytes=Aira.archive(result);
    save('aira-'+Aira.MODELS[target].toLowerCase()+'-restore.zip',bytes,'application/zip');
    message('package-status',Aira.MODELS[target]+' ZIP prepared. Follow the installation steps below. Nothing has been flashed.');
    el('install-help').open=true;
  }catch(e){if(ticket===generation)message('package-status','No package produced: '+e.message);}
  finally{if(ticket===generation){busy=false;el('targets').disabled=!report?.switchable;el('risk').checked=false;sync();}}
});
// Optional read-only agent access; never registers a flashing or download action.
if(document.modelContext?.registerTool){try{Promise.resolve(document.modelContext.registerTool({name:'read_aira_inspection',description:'Read the existing local inspection report. Does not open files, prepare a package, or access a device.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute(input){if(!input||typeof input!=='object'||Object.keys(input).length)throw new Error('Expected an empty object.');return report?JSON.parse(JSON.stringify(report)):{status:'No inspected backup'};}})).catch(()=>{});}catch{}}
