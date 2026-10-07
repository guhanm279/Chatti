// Initial Demo Data Seed for CHATTi

const initialUsers = [
  { id: 'user_guhan', name: 'Guhan', avatar: 'G', role: 'Product Lead', status: 'online' },
  { id: 'user_rahul', name: 'Rahul', avatar: 'R', role: 'Tech Lead', status: 'online' },
  { id: 'user_ananya', name: 'Ananya', avatar: 'A', role: 'Design Lead', status: 'online' },
  { id: 'user_priya', name: 'Priya', avatar: 'P', role: 'Frontend Dev', status: 'offline' },
  { id: 'user_arjun', name: 'Arjun', avatar: 'AR', role: 'Backend Dev', status: 'offline' }
];

const initialConversations = [
  { id: 'conv_alpha', name: 'Project Alpha', type: 'group', badge: 'Sprint 4' },
  { id: 'conv_rahul', name: 'Rahul', type: 'direct', badge: 'Direct' },
  { id: 'conv_ananya', name: 'Ananya', type: 'direct', badge: 'Direct' },
  { id: 'conv_nexus', name: 'Team Nexus', type: 'community', badge: 'Engineering' }
];

const initialMembers = [
  { conversation_id: 'conv_alpha', user_id: 'user_guhan' },
  { conversation_id: 'conv_alpha', user_id: 'user_rahul' },
  { conversation_id: 'conv_alpha', user_id: 'user_ananya' },
  { conversation_id: 'conv_alpha', user_id: 'user_priya' },
  { conversation_id: 'conv_alpha', user_id: 'user_arjun' },
  { conversation_id: 'conv_rahul', user_id: 'user_guhan' },
  { conversation_id: 'conv_rahul', user_id: 'user_rahul' },
  { conversation_id: 'conv_ananya', user_id: 'user_guhan' },
  { conversation_id: 'conv_ananya', user_id: 'user_ananya' },
  { conversation_id: 'conv_nexus', user_id: 'user_guhan' },
  { conversation_id: 'conv_nexus', user_id: 'user_rahul' },
  { conversation_id: 'conv_nexus', user_id: 'user_arjun' }
];

const initialMessages = [
  {
    id: 'msg_init_1',
    conversation_id: 'conv_alpha',
    sender_id: 'user_guhan',
    content: 'Should we submit the project today?',
    message_type: 'text',
    created_at: new Date(Date.now() - 3600000 * 2).toISOString()
  },
  {
    id: 'msg_init_2',
    conversation_id: 'conv_alpha',
    sender_id: 'user_rahul',
    content: 'I think we should submit today 👍',
    message_type: 'text',
    created_at: new Date(Date.now() - 3600000 * 1.8).toISOString()
  },
  {
    id: 'msg_init_3',
    conversation_id: 'conv_alpha',
    sender_id: 'user_ananya',
    content: "I'll finish the PPT before 6.",
    message_type: 'text',
    created_at: new Date(Date.now() - 3600000 * 1.5).toISOString()
  },
  {
    id: 'msg_init_4',
    conversation_id: 'conv_alpha',
    sender_id: 'user_guhan',
    content: 'Rahul, can you send the database details?',
    message_type: 'text',
    created_at: new Date(Date.now() - 3600000 * 1.2).toISOString()
  }
];

const initialTasks = [
  {
    id: 'task_sample_1',
    message_id: 'msg_init_3',
    assigned_to: 'user_ananya',
    title: 'Finish the PPT deck',
    description: 'Presentation deck for final evaluation sync and team alignment.',
    deadline: 'Today, 6:00 PM',
    status: 'pending',
    created_at: new Date(Date.now() - 3600000 * 1.4).toISOString()
  },
  {
    id: 'task_sample_2',
    message_id: null,
    assigned_to: 'user_rahul',
    title: 'Review Aiven PostgreSQL schema & indexes',
    description: 'Ensure SSL connections and verify constraints.',
    deadline: 'Tomorrow, 12:00 PM',
    status: 'pending',
    created_at: new Date(Date.now() - 3600000 * 4).toISOString()
  }
];

const initialFuses = [];
const initialVotes = [];
const initialWhispers = [];

const initialActivity = [
  {
    id: 'act_1',
    user_id: 'user_guhan',
    type: 'task',
    title: 'Guhan assigned a task to Ananya',
    detail: 'Finish the PPT deck before 6:00 PM',
    created_at: new Date(Date.now() - 3600000 * 1.4).toISOString()
  },
  {
    id: 'act_2',
    user_id: 'user_rahul',
    type: 'decision_locked',
    title: 'Project Alpha decision recorded',
    detail: 'Adopt WebSocket for live updates',
    created_at: new Date(Date.now() - 86400000).toISOString()
  }
];

module.exports = {
  initialUsers,
  initialConversations,
  initialMembers,
  initialMessages,
  initialTasks,
  initialFuses,
  initialVotes,
  initialWhispers,
  initialActivity
};
