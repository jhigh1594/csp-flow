type Milestone = {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  targetDate: string;
  totalTasks: number;
  completedTasks: number;
  createdAt: string;
  updatedAt: string;
};

export default Milestone;
