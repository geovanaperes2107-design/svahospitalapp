# Guia de Configuração do GitHub para o SVA

Atualmente, o software **Git** (necessário para usar o GitHub) não está instalado ou configurado neste computador. Siga os passos abaixo para conectar seu projeto.

## Passo 1: Instalar o Git

1. Acesse o site oficial: [git-scm.com/download/win](https://git-scm.com/download/win)
2. Clique em **"Click here to download"** para baixar a versão mais recente.
3. Execute o instalador baixado.
4. Pode clicar em **"Next"** (Próximo) em todas as telas até concluir a instalação (as configurações padrão funcionam bem).
5. **Importante:** Após instalar, **reinicie o seu VS Code** (feche e abra novamente) para ele reconhecer o Git.

## Passo 2: Criar Repositório no 
https://github.com/geovanaperes2107-design/SVA---Sistema-de-Vigil-ncia-de-Antimicrobianos.git


1. Vá em [github.com/new](https://github.com/new) e faça login.
2. Dê um nome ao repositório (ex: `sva-antimicrobianos`).
3. Deixe marcado como **Private** (Privado) se não quiser que outros vejam o código.
4. Clique em **Create repository**.

## Passo 3: Conectar o Projeto

Após instalar o Git e criar o repositório online, abra o **Terminal** aqui no VS Code (Ctrl + ') e digite os comandos abaixo, um por um:

```bash
# 1. Iniciar o Git no projeto
git init

# 2. Adicionar todos os arquivos
git add .

# 3. Salvar a primeira versão
git commit -m "Primeira versão do SVA"

# 4. Mudar para o ramo principal 'main'
git branch -M main

# 5. Conectar com o GitHub (SUBSTITUA PELO SEU LINK)
# Você pega esse link na página do repositório que criou no Passo 2
git remote add origin https://github.com/SEU-USUARIO/sva-antimicrobianos.git

# 6. Enviar os arquivos
git push -u origin main
```

## Dúvida Comum
**P:** Apareceu "Author identity unknown"?
**R:** O Git precisa saber quem você é. Digite:
```bash
git config --global user.email "seu-email@exemplo.com"
git config --global user.name "Seu Nome"
```
