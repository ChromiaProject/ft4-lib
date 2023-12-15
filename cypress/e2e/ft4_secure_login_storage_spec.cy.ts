describe('FT4 Library Secure Login Storage Test', () => {
  it('stores and retrieves login details accurately from session storage', () => {
    cy.visit('/?storageType=session');

    cy.window().should((win) => {
      const sessionData = win.sessionStorage.getItem('FT_LOGIN_KEY_STORE');
      expect(sessionData).to.exist;

      const parsedSessionData = JSON.parse(sessionData!);
      expect(parsedSessionData).to.have.keys(['privKey', 'accountId']);
      expect(parsedSessionData.privKey).to.match(/[0-9a-f]{64}/i);
      expect(parsedSessionData.accountId).to.match(/[0-9a-f]{64}/i);
    });
  });

  it('stores and retrieves login details accurately from local storage', () => {
    cy.visit('/?storageType=local');
    
    cy.window().should((win) => {
      const localData = win.localStorage.getItem('FT_LOGIN_KEY_STORE');
      expect(localData).to.exist;

      const parsedLocalData = JSON.parse(localData!);
      expect(parsedLocalData).to.have.keys(['privKey', 'accountId']);
      expect(parsedLocalData.privKey).to.match(/[0-9a-f]{64}/i);
      expect(parsedLocalData.accountId).to.match(/[0-9a-f]{64}/i);
    });
  });

});
