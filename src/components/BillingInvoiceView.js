import html2pdf from "html2pdf.js";

const downloadInvoice = () => {

  const element = document.getElementById("invoicePDF");

  const opt = {
    margin: 10,
    filename: `Invoice-${selectedInvoice.invoiceNumber}.pdf`,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
  };

  html2pdf().set(opt).from(element).save();
};