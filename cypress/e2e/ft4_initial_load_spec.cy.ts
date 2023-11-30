describe('FT4 Library Browser Test', () => {
  it('loads the FT4 library without crashing', () => {
    cy.visit('/'); // Adjust this if your app's URL is different
    // Add more actions or assertions as needed
    cy.contains('FT4 Demo App'); // Adjust based on the actual content of your app
  });
});
