const API_BASE ="https://convertly-api-hsli.onrender.com";
const fileInput = document.querySelector("#fileInput");
const dropzone = document.querySelector("#dropzone");
const browseBtn = document.querySelector("#browseBtn");
const fileRow = document.querySelector("#fileRow");
const fileName = document.querySelector("#fileName");
const fileSize = document.querySelector("#fileSize");
const fromFormat = document.querySelector("#fromFormat");
const toFormat = document.querySelector("#toFormat");
const convertBtn = document.querySelector("#convertBtn");
const statusBox = document.querySelector("#status");
const resultBox = document.querySelector("#result");
const downloadBtn = document.querySelector("#downloadBtn");
let selectedFile = null;

document.querySelector("#year").textContent = new Date().getFullYear();
function extOf(name) { return (name.split(".").pop() || "").toLowerCase(); }
function humanSize(n) { return n < 1024*1024 ? `${(n/1024).toFixed(1)} KB` : `${(n/1024/1024).toFixed(2)} MB`; }
function setStatus(message, isError=false) { statusBox.textContent=message; statusBox.classList.remove("hidden","error"); if(isError) statusBox.classList.add("error"); }
function clearStatus() { statusBox.classList.add("hidden"); statusBox.classList.remove("error"); resultBox.classList.add("hidden"); }
function setFile(file) {
  clearStatus();
  if (!file) return;
  selectedFile=file;
  fileName.textContent=file.name;
  fileSize.textContent=humanSize(file.size);
  fromFormat.value=extOf(file.name).toUpperCase() || "UNKNOWN";
  fileRow.classList.remove("hidden");
  dropzone.classList.add("hidden");
  convertBtn.disabled=false;
  // Suggest a different common target format.
  const source=extOf(file.name);
  const preferred={pdf:"docx",docx:"pdf",doc:"pdf",png:"jpg",jpg:"png",jpeg:"png",webp:"png",xlsx:"csv",csv:"xlsx",pptx:"pdf",txt:"pdf",odt:"pdf"};
  const option=preferred[source];
  if(option && [...toFormat.options].some(o=>o.value===option)) toFormat.value=option;
}
function resetFile() {
  selectedFile=null; fileInput.value=""; fileRow.classList.add("hidden"); dropzone.classList.remove("hidden"); convertBtn.disabled=true; clearStatus();
}
browseBtn.addEventListener("click",e=>{e.stopPropagation();fileInput.click();});
dropzone.addEventListener("click",()=>fileInput.click());
dropzone.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();fileInput.click();}});
fileInput.addEventListener("change",()=>setFile(fileInput.files[0]));
["dragenter","dragover"].forEach(type=>dropzone.addEventListener(type,e=>{e.preventDefault();dropzone.classList.add("dragover");}));
["dragleave","drop"].forEach(type=>dropzone.addEventListener(type,e=>{e.preventDefault();dropzone.classList.remove("dragover");}));
dropzone.addEventListener("drop",e=>setFile(e.dataTransfer.files[0]));
document.querySelector("#removeFile").addEventListener("click",resetFile);

convertBtn.addEventListener("click", async()=>{
  if(!selectedFile)return;
  clearStatus();
  if(!API_BASE){setStatus("The website UI is ready, but the conversion backend is not configured yet. Deploy the backend and set CONVERTER_API_URL in public/app.js as described in README.md.",true);return;}
  if(extOf(selectedFile.name)===toFormat.value){setStatus("Choose a different target format from the original file.",true);return;}
  const data=new FormData(); data.append("file",selectedFile); data.append("targetFormat",toFormat.value);
  convertBtn.disabled=true; convertBtn.textContent="Converting…";
  setStatus("Uploading your file and converting it. This may take a little while.");
  try{
    const response=await fetch(`${API_BASE}/api/convert`,{method:"POST",body:data});
    const payload=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(payload.error||`Conversion failed (${response.status}).`);
    if(!payload.downloadUrl)throw new Error("The server did not return a download link.");
    downloadBtn.href=payload.downloadUrl;
    downloadBtn.setAttribute("download",payload.fileName||"converted-file");
    resultBox.classList.remove("hidden"); statusBox.classList.add("hidden");
  }catch(err){setStatus(err.message||"Conversion failed. Please try again.",true);}
  finally{convertBtn.disabled=false;convertBtn.innerHTML='Convert file <span>→</span>';}
});
