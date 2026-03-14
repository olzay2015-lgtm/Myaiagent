import { createTool } from '../registry';
import { ToolResult, ToolContext, ToolInput } from '../interfaces';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * File System Tool
 * Read, write, and manage files in a sandboxed directory
 */
async function fileSystemHandler(input: ToolInput, context: ToolContext): Promise<ToolResult> {
  const { operation, filePath: relativePath, content, encoding = 'utf-8' } = input;

  if (!operation || typeof operation !== 'string') {
    return {
      success: false,
      error: 'Operation is required',
    };
  }

  if (!relativePath || typeof relativePath !== 'string') {
    return {
      success: false,
      error: 'File path is required',
    };
  }

  try {
    // Get sandbox root from config or use default
    const sandboxRoot = (context.toolConfig.sandboxPath as string) || './sandbox';
    
    // Resolve and validate path (prevent directory traversal)
    const fullPath = path.resolve(sandboxRoot, relativePath as string);
    const resolvedSandbox = path.resolve(sandboxRoot);
    
    if (!fullPath.startsWith(resolvedSandbox)) {
      return {
        success: false,
        error: 'Access denied: path is outside of sandbox',
      };
    }

    switch (operation) {
      case 'read': {
        try {
          const data = await fs.readFile(fullPath, { encoding: encoding as BufferEncoding });
          return {
            success: true,
            data: {
              content: data,
              path: relativePath,
              size: Buffer.byteLength(data, encoding as BufferEncoding),
            },
          };
        } catch (error: any) {
          if (error.code === 'ENOENT') {
            return {
              success: false,
              error: `File not found: ${relativePath}`,
            };
          }
          throw error;
        }
      }

      case 'write': {
        if (content === undefined) {
          return {
            success: false,
            error: 'Content is required for write operation',
          };
        }

        // Ensure directory exists
        await fs.mkdir(path.dirname(fullPath), { recursive: true });
        
        // Write file
        await fs.writeFile(fullPath, content as string, { encoding: encoding as BufferEncoding });
        
        return {
          success: true,
          data: {
            operation: 'write',
            path: relativePath,
            bytesWritten: Buffer.byteLength(content as string, encoding as BufferEncoding),
          },
        };
      }

      case 'delete': {
        try {
          await fs.unlink(fullPath);
          return {
            success: true,
            data: {
              operation: 'delete',
              path: relativePath,
              deleted: true,
            },
          };
        } catch (error: any) {
          if (error.code === 'ENOENT') {
            return {
              success: false,
              error: `File not found: ${relativePath}`,
            };
          }
          throw error;
        }
      }

      case 'list': {
        try {
          const entries = await fs.readdir(fullPath, { withFileTypes: true });
          return {
            success: true,
            data: {
              path: relativePath,
              entries: entries.map(entry => ({
                name: entry.name,
                type: entry.isDirectory() ? 'directory' : 'file',
              })),
            },
          };
        } catch (error: any) {
          if (error.code === 'ENOENT') {
            return {
              success: false,
              error: `Directory not found: ${relativePath}`,
            };
          }
          throw error;
        }
      }

      case 'exists': {
        try {
          await fs.access(fullPath);
          return {
            success: true,
            data: {
              path: relativePath,
              exists: true,
            },
          };
        } catch {
          return {
            success: true,
            data: {
              path: relativePath,
              exists: false,
            },
          };
        }
      }

      default:
        return {
          success: false,
          error: `Unknown operation: ${operation}. Supported: read, write, delete, list, exists`,
        };
    }
  } catch (error) {
    console.error('File system error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'File operation failed',
    };
  }
}

export const fileSystemTool = createTool({
  id: 'builtin-file-system',
  name: 'File System',
  slug: 'file_system',
  description: 'Read, write, and manage files in a sandboxed directory. Use this to access documents, save data, or manage files.',
  category: 'FILE_SYSTEM',
  icon: 'file-text',
  isBuiltin: true,
  timeoutMs: 10000,
  requiresAuth: false,
  
  inputSchema: {
    type: 'object',
    description: 'Parameters for file system operations',
    properties: {
      operation: {
        type: 'string',
        description: 'The operation to perform',
        enum: ['read', 'write', 'delete', 'list', 'exists'],
      },
      filePath: {
        type: 'string',
        description: 'Path to the file or directory (relative to sandbox)',
      },
      content: {
        type: 'string',
        description: 'Content to write (required for write operation)',
      },
      encoding: {
        type: 'string',
        description: 'File encoding',
        enum: ['utf-8', 'base64', 'binary'],
        default: 'utf-8',
      },
    },
    required: ['operation', 'filePath'],
  },
  
  configSchema: {
    type: 'object',
    description: 'Configuration for file system tool',
    properties: {
      sandboxPath: {
        type: 'string',
        description: 'Root directory for sandboxed file access',
        default: './sandbox',
      },
      allowedExtensions: {
        type: 'array',
        description: 'Allowed file extensions (empty = all allowed)',
        items: {
          type: 'string',
        },
      },
    },
    required: [],
  },
  
  handler: fileSystemHandler,
});
