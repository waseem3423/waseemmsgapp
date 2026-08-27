'use server';
/**
 * @fileOverview A flow to set the app-wide announcement configuration.
 *
 * - setAnnouncementConfig - Updates the announcement configuration file.
 * - AnnouncementConfigInput - The input type for the setAnnouncementConfig function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import * as fs from 'fs/promises';
import * as path from 'path';

const AnnouncementConfigInputSchema = z.object({
  text: z.string().describe('The announcement message to display.'),
  active: z.boolean().describe('Whether the announcement is active or not.'),
});
export type AnnouncementConfigInput = z.infer<typeof AnnouncementConfigInputSchema>;

export async function setAnnouncementConfig(input: AnnouncementConfigInput): Promise<void> {
  return setAnnouncementConfigFlow(input);
}

const setAnnouncementConfigFlow = ai.defineFlow(
  {
    name: 'setAnnouncementConfigFlow',
    inputSchema: AnnouncementConfigInputSchema,
    outputSchema: z.void(),
  },
  async (input) => {
    const configPath = path.join(process.cwd(), 'src', 'lib', 'config.json');
    try {
      // It's important to read the file first to not overwrite other potential settings
      const currentConfigFile = await fs.readFile(configPath, 'utf-8');
      const currentConfig = JSON.parse(currentConfigFile);
      
      const newConfig = {
        ...currentConfig,
        announcement: {
          text: input.text,
          active: input.active,
        },
      };

      await fs.writeFile(configPath, JSON.stringify(newConfig, null, 4), 'utf-8');
      console.log('Announcement configuration updated successfully.');
    } catch (error) {
      console.error('Failed to write announcement configuration:', error);
      // In a real app, you'd want more robust error handling
      throw new Error('Could not update announcement configuration.');
    }
  }
);
