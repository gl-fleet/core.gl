import Anthropic from '@anthropic-ai/sdk'
import { Host } from 'unet'

const COMMAND_INSTRUCTIONS = `
=== TERMINOLOGY (use these exact Mongolian terms) ===
- Drilled = Өрөмдсөн
- Total holes = Нийт цооног
- Remaining = Үлдсэн
- Completion = Гүйцэтгэл
- Over target = Зорилтоос давсан
- Under target = Зорилтод хүрээгүй
- On target = Зорилтод хүрсэн
- Net drill time = Цэвэр өрөмдлөгийн хугацаа
- Paused = Түр зогссон

=== FILE GENERATION COMMANDS ===
If the user requests to generate, download, export, or print a file (PDF, CSV, report),
respond ONLY with a raw JSON object — no other text, no markdown, no explanation:

Generate PDF of the full report:
{"action":"generate_pdf"}

Generate CSV files:
{"action":"generate_csv"}

Generate PDF for a specific hole (replace S2 with the actual hole ID):
{"action":"generate_pdf","holeId":"S2"}

=== LANGUAGE RULE (STRICT) ===
ALWAYS reply in the exact same language the user writes in.
English input → English response.
Mongolian input → Mongolian response.
NEVER switch languages unless the user switches first.
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

            const { sessionId, message, reportContext } = req.body

            console.log('--- SYSTEM PROMPT ---')
            console.log(reportContext)
            console.log('--- COMMAND INSTRUCTION ---')
            console.log(COMMAND_INSTRUCTIONS)
            console.log('--- USER MESSAGE ---')
            console.log(message)

            const count = this.sessionUsage.get(sessionId) ?? 0
            if (count >= 20) {
                return { error: 'Question limit reached', limitReached: true }
            }
            this.sessionUsage.set(sessionId, count + 1)

            try {
                const response = await this.anthropic.messages.create({
                    // model: "claude-sonnet-4-6", Smarter but costy!
                    model: 'claude-haiku-4-5-20251001',
                    max_tokens: 1000,
                    system: [
                        {
                            type: 'text',
                            text: reportContext,
                            cache_control: { type: 'ephemeral' },
                        },
                        {
                            type: 'text',
                            text: COMMAND_INSTRUCTIONS,
                            cache_control: { type: 'ephemeral' }
                        }
                    ],
                    messages: [{ role: 'user', content: message }],
                })

                console.log(response.usage)

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