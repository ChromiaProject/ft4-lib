import React, { useState, useEffect } from 'react';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckIcon from '@mui/icons-material/Check';
import UndoIcon from '@mui/icons-material/Undo';

import { 
  Alert,
  Checkbox, 
  IconButton, 
  List, 
  ListItem, 
  ListItemButton, 
  ListItemIcon, 
  ListItemSecondaryAction, 
  ListItemText
} from '@mui/material';

import { IClient, createClient } from 'postchain-client';
import {
  createKeyStoreInteractor,
  createWeb3ProviderEvmKeyStore,
  Session,
  registerAccount,
  registrationStrategy,
  EvmKeyStore,
  createSingleSigAuthDescriptorRegistration,
  op
} from '@chromia/ft4';

declare global {
  interface Window { ethereum: any }
}

type Task = {
  rowid: number;
  description: string;
  completed: boolean;
  creation_timestamp: number;
  completion_timestamp: number;
}

function getPostchainClient(): Promise<IClient> {
  const url = 'http://localhost:7740';

  return createClient({
    nodeUrlPool: url,
    blockchainIid: 0,
  });
}

async function getUserSession(client: IClient, store: EvmKeyStore): Promise<Session | null> {
  const { getAccounts, getSession } = createKeyStoreInteractor(client, store);
  const accounts = await getAccounts();

  if (!accounts.length) {
    return null;
  }

  return getSession(accounts[0].id)
}

async function register(client: IClient, keyStore: EvmKeyStore): Promise<Session> {
  const authDescriptor = createSingleSigAuthDescriptorRegistration(["A", "T"], keyStore.id);
  const { session } = await registerAccount(client, keyStore, registrationStrategy.open(authDescriptor));
  return session;
}

function fetchTasks(session: Session, showCompleted: boolean): Promise<Task[]> {
  return session.query<Task[]>("get_tasks", {
    account_id: session!.account.id,
    include_completed: showCompleted
  })
}

function App() {
  const [client, setClient] = useState<IClient | null>(null);
  const [keyStore, setKeyStore] = useState<EvmKeyStore | null>(null);
  const [session, setSession] = useState<Session | null>(null);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskDescription, setTaskDescription] = useState('');
  const [showCompleted, setShowCompleted] = useState(false);
  const [addingInProgress, setAddingInProgress] = useState(false);

  const [hasMetamask, setHasMetamask] = useState(true);

  useEffect(() => {
    const initializeSession = async () => {
      const client = await getPostchainClient();
      setClient(client);

      if (window.ethereum === undefined) {
        setHasMetamask(false)
        return;
      }

      const keyStore = await createWeb3ProviderEvmKeyStore(window.ethereum);
      setKeyStore(keyStore);

      setSession(await getUserSession(client, keyStore));
    };

    initializeSession();
  }, []);

  useEffect(() => {
    if (!session) {
      return;
    }

    fetchTasks(session, showCompleted).then(setTasks)
  }, [session, showCompleted]);

  const handleRegister = async () => {
    const session = await register(client!, keyStore!)
    setSession(session);
  }  

  const handleAddTask = async () => {
    setAddingInProgress(true)
    await session!.call(op("add_task", taskDescription));
    const task = await session!.query<Task>("get_last_task", { account_id: session!.account.id });
    setAddingInProgress(false)
    setTaskDescription("");
    setTasks([...tasks, task]);
  }

  const handleDeleteTask = async (rowid: number) => {
    await session!.call(op("delete_task", rowid));
    setTasks(tasks.filter((task) => task.rowid !== rowid));
  }

  const handleCompleteTask = async (rowid: number) => {
    await session!.call(op("complete_task", rowid));
    if (showCompleted) {
      const completedTask = await session!.query<Task>("get_task", {
        account_id: session!.account.id,
        rowid
      });

      setTasks(tasks.map((task) => task.rowid === rowid ? completedTask : task));
    } else {
      setTasks(tasks.filter((task) => task.rowid !== rowid));
    }
  }

  const handleUndoCompleteTask = async (rowid: number) => {
    await session!.call(op("undo_complete_task", rowid))
    if (showCompleted) {
      const undoCompletedTask = await session!.query<Task>("get_task", {
        account_id: session!.account.id,
        rowid
      });

      setTasks(tasks.map((task) => task.rowid === rowid ? undoCompletedTask : task));
    } else {
      setTasks(tasks.filter((task) => task.rowid !== rowid));
    }
  }

  const handleShowCompleted = async (showCompleted: boolean) => {
    setShowCompleted(showCompleted);
    try {
      setTasks(await fetchTasks(session!, showCompleted));
    } catch {
      setShowCompleted(!showCompleted)
    }
  }  

return (
  <Box
    className="App"
    display="flex"
    flexDirection="column"
    alignItems="center"
    justifyContent="center"
    style={{ minHeight: '100vh', textAlign: 'center' }}
  >
    <Typography variant="h3" gutterBottom>
      Todo
    </Typography>
    {!hasMetamask ? (
      <Alert severity="error">
        Cannot find Metamask. Please install Metamask browser extension.
      </Alert>
    ) : (
      <Box>
      {client && !session ? (
        <Box>
          <Button
            variant="contained"
            onClick={handleRegister}
            sx={{ fontSize: '1.2rem', padding: '0.8rem 1.6rem' }}
          >
            Register
          </Button>
        </Box>
      ) : (
        <Box sx={{ margin: '1rem 0' }}>
          <Box>
            <TextField
              label="Description"
              variant="outlined"
              multiline
              rows={2}
              value={taskDescription}
              onChange={e => setTaskDescription(e.target.value)}
              sx={{ marginBottom: '1rem', width: '360px' }}
            />
          </Box>
          <Box>
            <Button
              variant="contained"
              onClick={handleAddTask}
              disabled={!session || !taskDescription || addingInProgress}
              sx={{ fontSize: '1.2rem' }}
            >
              Add Task
            </Button>
          </Box>
        </Box>
      )}
      {tasks.length ? (
        <List sx={{ width: '100%', maxWidth: 360, bgcolor: 'background.paper', paddingTop: '2rem' }}>
          <ListItem
            key="show-completed"
            disablePadding
          >
            <ListItemButton role={undefined} dense>
              <ListItemIcon>
                <Checkbox
                  edge="start"
                  checked={showCompleted}
                  tabIndex={-1}
                  disableRipple
                  onClick={() => handleShowCompleted(!showCompleted)}
                  inputProps={{ 'aria-labelledby': "show-completed-label" }}
                />
              </ListItemIcon>
              <ListItemText id="show-completed-label" primary="Show completed tasks" />
            </ListItemButton>
          </ListItem>        
          {tasks.map((asset, index) => (
            <ListItem
              key={asset.rowid}
              disablePadding
            >
              <ListItemButton role={undefined} dense>
                <ListItemText id={`checkbox-list-label-${asset.rowid}`} primary={asset.description} />
                <ListItemSecondaryAction>
                  {asset.completed ? (
                    <IconButton onClick={() => handleUndoCompleteTask(asset.rowid)} aria-label="undo">
                      <UndoIcon />
                    </IconButton>
                  ):(
                    <IconButton onClick={() => handleCompleteTask(asset.rowid)} aria-label="complete">
                      <CheckIcon />
                    </IconButton>
                  )}
                  <IconButton onClick={() => handleDeleteTask(asset.rowid)} edge="end" aria-label="delete">
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItemButton>
            </ListItem>
          ))}
        </List>
        ) : (
        <Box sx={{ paddingTop: '2rem' }}>
          <Typography>No tasks</Typography>
        </Box>
      )}
      </Box>
    )}
  </Box>
);

}

export default App;
