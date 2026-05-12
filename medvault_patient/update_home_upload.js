const fs = require('fs');
const path = require('path');

const pagePath = path.join(__dirname, 'src/app/page.js');
let page = fs.readFileSync(pagePath, 'utf8');

// Add new states
const stateInsertPoint = "const [sosModalOpen, setSosModalOpen] = useState(false);";
const stateCode = `  const [uploadMenuOpen, setUploadMenuOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const cameraRef = useRef(null);
  const fileRef = useRef(null);

  const handleFileSelected = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadMenuOpen(false);
    setToastMessage("Encrypting and saving " + file.name + "...");
    setTimeout(() => {
      setToastMessage("Successfully saved to Vault!");
      setTimeout(() => setToastMessage(""), 3500);
    }, 2500);
  };
`;
if (!page.includes('const [uploadMenuOpen')) {
  page = page.replace(stateInsertPoint, stateInsertPoint + '\n' + stateCode);
}

// Modify the Upload New button to open the menu
const buttonTarget = `<button className="bg-secondary-container rounded-xl p-6 flex flex-col justify-between items-start aspect-square relative overflow-hidden group hover:opacity-90 transition-opacity">`;
const buttonReplace = `<button onClick={() => setUploadMenuOpen(true)} className="bg-secondary-container rounded-xl p-6 flex flex-col justify-between items-start aspect-square relative overflow-hidden group hover:opacity-90 transition-opacity active:scale-[0.98]">`;
page = page.replace(buttonTarget, buttonReplace);

// Add the Upload Menu and Toast to the top of the return
const returnInsertPoint = "{/* TopAppBar */}";
const uploadMenuCode = `      {/* Hidden Inputs for Upload */}
      <input type="file" accept="image/*" capture="environment" hidden ref={cameraRef} onChange={handleFileSelected} />
      <input type="file" accept="image/*,application/pdf" hidden ref={fileRef} onChange={handleFileSelected} />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[110] bg-inverse-surface text-inverse-on-surface px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
          <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
          <span className="text-sm font-medium whitespace-nowrap">{toastMessage}</span>
        </div>
      )}

      {/* Upload Bottom Sheet */}
      {uploadMenuOpen && (
        <div 
          className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center"
          style={{ background: 'rgba(1,38,31,0.4)', backdropFilter: 'blur(4px)' }}
          onClick={() => setUploadMenuOpen(false)}
        >
          <div 
            className="w-full sm:w-96 bg-surface-container-lowest rounded-t-[2rem] sm:rounded-[2rem] p-6 pb-12 sm:pb-6 shadow-2xl animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-4 duration-300"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 bg-outline-variant/50 rounded-full mx-auto mb-6 sm:hidden"></div>
            <h3 className="text-xl font-bold text-on-surface mb-2">Upload Document</h3>
            <p className="text-sm text-on-surface-variant mb-6">Choose how you want to add your medical record to the vault.</p>
            
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => cameraRef.current?.click()}
                className="w-full bg-primary text-on-primary rounded-2xl p-4 flex items-center gap-4 hover:opacity-90 transition-opacity active:scale-[0.98]"
              >
                <div className="w-10 h-10 rounded-full bg-on-primary/20 flex items-center justify-center">
                  <span className="material-symbols-outlined">photo_camera</span>
                </div>
                <div className="text-left">
                  <div className="font-bold">Take Photo</div>
                  <div className="text-xs text-on-primary/80">Scan document with camera</div>
                </div>
              </button>
              
              <button 
                onClick={() => fileRef.current?.click()}
                className="w-full bg-surface-container-highest text-on-surface rounded-2xl p-4 flex items-center gap-4 hover:bg-surface-variant transition-colors active:scale-[0.98]"
              >
                <div className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center">
                  <span className="material-symbols-outlined">folder</span>
                </div>
                <div className="text-left">
                  <div className="font-bold">Choose File</div>
                  <div className="text-xs text-on-surface-variant">Upload PDF or Image from device</div>
                </div>
              </button>
            </div>
            
            <button 
              onClick={() => setUploadMenuOpen(false)}
              className="mt-6 w-full py-3 text-sm font-bold text-on-surface-variant hover:text-on-surface transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
`;
if (!page.includes('uploadMenuOpen &&')) {
  page = page.replace(returnInsertPoint, uploadMenuCode + '\n      ' + returnInsertPoint);
}

fs.writeFileSync(pagePath, page);
console.log("Updated page.js with upload menu");
