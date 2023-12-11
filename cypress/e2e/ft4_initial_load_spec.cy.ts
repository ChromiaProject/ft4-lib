describe('FT4 Library Browser Test', () => {
  it('loads the FT4 library without crashing', () => {
    cy.visit('/');
    cy.acceptMetamaskAccess();
    cy.contains('FT4 Demo App');
  });
});
