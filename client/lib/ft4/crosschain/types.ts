import { Buffer } from "buffer";

// might be used later to cache?
export type TreeNode = {
  brid: Buffer;
  children: Array<TreeNode>;
  parent: TreeNode;
};
