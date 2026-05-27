/**
 * Download HTML content as PDF using html2pdf
 */
export async function downloadPDF(html: string, filename: string) {
  // Dynamically load html2pdf library
  const script = document.createElement('script');
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
  
  return new Promise((resolve, reject) => {
    script.onload = () => {
      try {
        const element = document.createElement('div');
        element.innerHTML = html;
        
        const opt = {
          margin: 10,
          filename: filename,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2 },
          jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
        };
        
        // @ts-ignore - html2pdf is loaded dynamically
        html2pdf().set(opt).from(element).save();
        resolve(true);
      } catch (error) {
        reject(error);
      }
    };
    
    script.onerror = () => {
      reject(new Error('Failed to load html2pdf library'));
    };
    
    document.head.appendChild(script);
  });
}
