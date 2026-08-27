'use server';

/**
 * @fileOverview Provides smart reply suggestions based on the content of received messages.
 *
 * - getSmartReplySuggestions - A function that generates smart reply suggestions for a given message.
 * - SmartReplySuggestionsInput - The input type for the getSmartReplySuggestions function.
 * - SmartReplySuggestionsOutput - The return type for the getSmartReplySuggestions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SmartReplySuggestionsInputSchema = z.object({
  message: z.string().describe('The message to generate smart reply suggestions for.'),
});
export type SmartReplySuggestionsInput = z.infer<typeof SmartReplySuggestionsInputSchema>;

const SmartReplySuggestionsOutputSchema = z.object({
  suggestions: z.array(z.string()).describe('An array of smart reply suggestions.'),
});
export type SmartReplySuggestionsOutput = z.infer<typeof SmartReplySuggestionsOutputSchema>;

export async function getSmartReplySuggestions(
  input: SmartReplySuggestionsInput
): Promise<SmartReplySuggestionsOutput> {
  return smartReplySuggestionsFlow(input);
}

const smartReplySuggestionsPrompt = ai.definePrompt({
  name: 'smartReplySuggestionsPrompt',
  input: {schema: SmartReplySuggestionsInputSchema},
  output: {schema: SmartReplySuggestionsOutputSchema},
  prompt: `You are a helpful assistant that provides smart reply suggestions for a given message.

  Generate a maximum of 3 suggestions that are relevant and concise.

  Message: {{{message}}}

  Suggestions:`,
});

const smartReplySuggestionsFlow = ai.defineFlow(
  {
    name: 'smartReplySuggestionsFlow',
    inputSchema: SmartReplySuggestionsInputSchema,
    outputSchema: SmartReplySuggestionsOutputSchema,
  },
  async input => {
    try {
      const {output} = await smartReplySuggestionsPrompt(input);
      return output || { suggestions: [] };
    } catch (error) {
      console.log("Smart reply AI bypass:", error);
      return { suggestions: [] };
    }
  }
);
