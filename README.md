# usage-bars

Um mod para o Claude Code que mostra, acima do prompt de todos os chats, quanto você já usou dos limites da assinatura:

```
2h13m (▬▬▬▬▬──────) 42%      3d04h (▬▬▬▬▬▬▬▬▬▬─) 96%
```

- À esquerda, o limite de 5 horas; à direita, o semanal.
- Antes de cada barra, o tempo que falta até o limite renovar.
- A barra fica verde até 90% e vermelha acima disso.
- No app desktop a barra é desenhada fina e arredondada; no terminal, em texto.

Os números vêm do próprio Claude Code a cada resposta, então a faixa aparece depois da primeira resposta de cada chat. Só aparece em planos de assinatura (Pro/Max), que têm esses limites.

## Instalação

No prompt de uma sessão do Claude Code no terminal:

```
/plugin install usage-bars --marketplace lmarcansoni-sys/claude-usage-bars
```

Responda `y` para adicionar o marketplace e escolha o escopo (user, para valer em todas as sessões).

Pelo shell:

```bash
claude plugin install usage-bars --marketplace lmarcansoni-sys/claude-usage-bars
```

No app desktop, onde `/plugin` não roda: clique em + ao lado da caixa do prompt, depois Plugins, Add marketplace com `lmarcansoni-sys/claude-usage-bars`, e então Add plugin.

## Ajustes

Em `hooks/register.tsx`:

- `RED_FROM = 90`: a partir de quantos % a barra fica vermelha.
- `BAR_WIDTH = 110` e `BAR_HEIGHT = 5`: tamanho da barra em pixels no desktop.
