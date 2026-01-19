// src/prints/shared/openAndSavePdf.ts
export function openHtmlAndSavePdf(html: string, filenamePrefix: string) {
  const w = window.open("", "_blank", "width=900,height=1100");
  if (!w) throw new Error("Popup bloqueado");

  w.document.open();
  w.document.write(html);
  w.document.close();

  // injeta html2pdf e roda lá dentro
  const code = `
    (function(){
      function cleanup(){
        try{
          document.querySelectorAll('script, button, .nao-imprimir, [role="button"]').forEach(e=>e.remove());
          Array.from(document.querySelectorAll('*')).forEach((el)=>{
            try{ if(getComputedStyle(el).position==='fixed') el.remove(); }catch(e){}
          });
        }catch(e){}
      }
      function run(){
        try{
          cleanup();
          const opt = {
            margin: 10,
            filename: '${filenamePrefix}'+(new Date()).toISOString().slice(0,19).replace(/[:T]/g,'')+'.pdf',
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'pt', format: 'a4', orientation: 'portrait' }
          };
          const el = document.querySelector('center') || document.body.firstElementChild || document.body;
          if (window.html2pdf) window.html2pdf().set(opt).from(el).save();
          else window.print();
        } catch(e){ console.error(e); window.print(); }
      }
      if (window.html2pdf) run();
      else {
        var s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.9.2/html2pdf.bundle.min.js';
        s.onload = run; s.onerror = function(){ window.print(); };
        document.head.appendChild(s);
      }
    })();
  `;
  const s = w.document.createElement("script");
  s.textContent = code;
  w.document.body.appendChild(s);
}
