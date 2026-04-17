export interface Category {
  id: string;
  tenant_id: string;
  name: string;
  parent_id?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CategoryTreeNode {
  id: string;
  name: string;
  children: CategoryTreeNode[];
}
