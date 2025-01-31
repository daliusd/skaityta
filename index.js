import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import path from 'path';

const fastify = Fastify({ logger: true });

const DATA_PATH = path.join(process.env.DATA_PATH, 'public');

fastify.register(fastifyStatic, { root: DATA_PATH });

fastify.addHook('preHandler', (request, reply, done) => {
  if (request.hostname === 'skaityta.lt') {
    reply.redirect(`https://www.skaityta.lt${request.raw.url}`);
  } else {
    done();
  }
});

fastify.get('/up', (request, reply) => {
  reply.type('text/html').send(`<p>OK</p>`);
});

const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: '0.0.0.0' });
    fastify.log.info(`Server listening on ${fastify.server.address().port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
