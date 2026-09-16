export const CONFIG = {
  APP_NAME: 'Saúde Mental Serra V5.2',
  API_URL: "https://script.google.com/macros/s/AKfycby06BeYxWDqHmjqw1V7ZqzdVPtks7-8bNb48pT7M3NjSzEVsyBkgteXJYUpPdkaWdLm/exec", // cole a URL /exec do Web App do Apps Script
  MOCK_MODE: false, // false após publicar o backend
  UPAS: ['Serra Sede','Carapina','Castelândia'],
  METAS: {
    treinamento:.90, risco:.90, manejo:.85, altaPlano:.90,
    encaminhamento:.90, notificacao:.95, contencao:.90, assertividade:.85
  }
};
