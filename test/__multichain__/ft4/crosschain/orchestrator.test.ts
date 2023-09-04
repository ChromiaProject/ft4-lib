/*
  Orchestrator usage:
  // The path is B and C without A becasue it is taken from the current connection

  const path: BufferId[] = ['bridB', 'bridC'];

  const amount = createAmount(100, 1);

  const orchestrator = createOrchestrator(recipientAccountId, amount, path, authenticator, connection);

  orchestrator.onTransferInit(() => {
    console.log('Transfer initiated');
  });

  orchestrator.onTransferHop(descriptor => {
    console.log(`Hopped to: ${descriptor.brid}`);
  });

  orchestrator.onTransferEnd(() => {
    console.log('Transfer complete');
  });

  orchestrator.transfer();

  


// Registering event listeners
onTransferHop(descriptor => {
  console.log(`Hopped to: ${descriptor.brid}`);
});

onTransferEnd(() => {
  console.log('Transfer complete');
});

// Orchestrator usage
const path: BufferId[] = ['B', 'C'];
const amount = createAmount(100, 1);
const orchestrator = createOrchestrator(recipientAccountId, amount, path, authenticator, connection);
orchestrator.transfer();
*/
