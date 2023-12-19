describe('FT4 Library Secure Login Storage Test', () => {
  it('stores and retrieves login details accurately from session storage', () => {
    cy.visit('/?storageType=session');

    cy.window().should((win) => {
      const sessionData = win.sessionStorage.getItem('FT_LOGIN_KEY_STORE');
      expect(sessionData).to.exist;

      const parsedSessionData = JSON.parse(sessionData ?? '{}');
      expect(parsedSessionData).to.be.an('object').and.to.not.be.empty;

      // Assuming there is only one key-value pair in the parsed data
      const accountId = Object.keys(parsedSessionData)[0];
      const privKey = parsedSessionData[accountId];

      expect(accountId).to.match(/[0-9a-f]{40}/i); // Ethereum addresses are 40 hex characters
      expect(privKey).to.match(/[0-9a-f]{64}/i); // Private keys are 64 hex characters
    });
  });

  it('stores and retrieves login details accurately from local storage', () => {
    cy.visit('/?storageType=local');
    
    cy.window().should((win) => {
      const localData = win.localStorage.getItem('FT_LOGIN_KEY_STORE');
      expect(localData).to.exist;

      const parsedLocalData = JSON.parse(localData ?? '{}');
      expect(parsedLocalData).to.be.an('object').and.to.not.be.empty;

      // Assuming there is only one key-value pair in the parsed data
      const accountId = Object.keys(parsedLocalData)[0];
      const privKey = parsedLocalData[accountId];

      expect(accountId).to.match(/[0-9a-f]{40}/i); // Ethereum addresses are 40 hex characters
      expect(privKey).to.match(/[0-9a-f]{64}/i); // Private keys are 64 hex characters
    });
  });
});
