# skaityta.lt

Šioje repozitorijoje laikomas skaityta.lt kodas. Istoriškai kodas buvo
parašytas python'u, bet dabar perrašiau į javascript'ą.

# Duomenų parsisiuntimas

Naudokite `retrieve.js` skriptą:

```
DATA_PATH=~/projects/skaityta-data/ node retrieve.js
```

Prieš tai sukurkite `entries.json` su minimaliu turiniu, jei neturite duomenų:

```json
{ "entries": {} }
```

# Serveris

```
DATA_PATH=~/projects/skaityta-data/ node index.js
```

## Docker

Build:

```sh
docker build -t skaityta .
```

Run:

```sh
docker run -p 3000:3000 -v ~/projects/skaityta-data:/data -e DATA_PATH=/data skaityta
```

## Kamal

`kamal deploy`

Pastaba: darau prielaidą, kad žinote, ką darote ಠ‿↼
