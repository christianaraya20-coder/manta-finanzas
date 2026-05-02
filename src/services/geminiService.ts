import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const geminiService = {
  async extractDocumentsFromImage(base64: string, mimeType: string) {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analiza esta captura de pantalla del SII (Servicio de Impuestos Internos de Chile) o este 
documento tributario. 
        Extrae de forma estructurada TODOS los documentos presentes en la tabla (Facturas, Boletas de Honorarios, 
Notas de Crédito, etc.).
        Para cada documento, identifica:
        - Tipo de documento (ej. 'Factura Electrónica', 'Boleta de Honorarios')
        - Folio / Número
        - Fecha (formato YYYY-MM-DD)
        - Emisor (Razón Social)
        - RUT del Emisor
        - Monto Total (valor numérico sin símbolos)
        - Estado
  
        Responde ÚNICAMENTE en formato JSON plano, con un array llamado 'documents'.`,
      config: {
        inlineData: {
          data: base64,
          mimeType: mimeType
        }
      } as any
    });
    return response;
  },

  async analyzeReconciliationMismatch(entity: string, bank: string) {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analiza la situación actual para ${entity} en ${bank}. Genera una sugerencia de 
conciliación para una transacción de servicios en la nube de este mes. Incluye un análisis de fluctuación de tipo 
de cambio (FX) si detectas discrepancias menores entre el banco y el ERP.`,
      config: {
        systemInstruction: "Eres un experto en conciliación bancaria para el holding Manta. Tu tarea es generar una sugerencia de emparejamiento entre una transacción bancaria y un registro ERP, analizando posibles variaciones por tipo de cambio. Responde en formato JSON.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            bank: { type: Type.STRING },
            bankLabel: { type: Type.STRING },
            erp: { type: Type.STRING },
            erpLabel: { type: Type.STRING },
            confidence: { type: Type.NUMBER },
            message: { type: Type.STRING },
            tags: { type: Type.ARRAY, items: { type: Type.STRING } },
            fxAnalysis: {
              type: Type.OBJECT,
              properties: {
                rate: { type: Type.STRING },
                adjustment: { type: Type.STRING },
                confidence: { type: Type.NUMBER },
                explanation: { type: Type.STRING }
              }
            }
          }
        }
      }
    });
    return response;
  }
};
