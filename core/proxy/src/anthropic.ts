import Anthropic from '@anthropic-ai/sdk'
import { Host } from 'unet'

const COMMAND_INSTRUCTIONS = `
=== FILE GENERATION COMMANDS ===
If the user requests to generate, download, export, or print a file (PDF, CSV, report),
respond ONLY with a raw JSON object — no other text, no markdown, no explanation:

Generate PDF of the full report:
{"action":"generate_pdf"}

Generate CSV files:
{"action":"generate_csv"}

Generate PDF for a specific hole (replace S2 with the actual hole ID):
{"action":"generate_pdf","holeId":"S2"}

For all other questions respond normally in Mongolian text.
`

export class AnthropicAPI {
    private anthropic: Anthropic
    private sessionUsage = new Map<string, number>()

    constructor(private api: Host, token: string) {
        this.anthropic = new Anthropic({ apiKey: token })
        this.register()
    }

    private register() {
        this.api.on('get-anthropic-chat', async (req: any) => {
            const { sessionId, message, reportContext } = req.query

            const count = this.sessionUsage.get(sessionId) ?? 0
            if (count >= 20) {
                return { error: 'Question limit reached', limitReached: true }
            }
            this.sessionUsage.set(sessionId, count + 1)

            try {
                const response = await this.anthropic.messages.create({
                    model: 'claude-haiku-4-5-20251001',
                    max_tokens: 400,
                    system: reportContext + COMMAND_INSTRUCTIONS,
                    messages: [{ role: 'user', content: message.slice(0, 500) }],
                })

                return {
                    answer: response.content[0].type === 'text' ? response.content[0].text : '',
                    remaining: 20 - (count + 1),
                }
            } catch (err: any) {
                return { error: err.message }
            }
        })
    }
}