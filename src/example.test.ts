import { MikroORM } from "@mikro-orm/sqlite";
import { defineEntity, p } from "@mikro-orm/core";
import { v4 } from "uuid";

const UserSchema = defineEntity({
  name: "User",
  properties: {
    id: p
      .string()
      .primary()
      .index()
      .onCreate(() => v4()),
    createdAt: p.datetime().onCreate(() => new Date()),
    updatedAt: p
      .datetime()
      .onCreate(() => new Date())
      .onUpdate(() => new Date()),
    email: p.string().unique().index(),
    name: p.string(),
  },
});

export class User extends UserSchema.class {
  name: string = "";
}
UserSchema.setClass(User);

let orm: MikroORM;

beforeAll(async () => {
  orm = await MikroORM.init({
    dbName: ":memory:",
    entities: [User],
    debug: ["query", "query-params"],
    allowGlobalContext: true, // only for testing
  });
  await orm.schema.refresh();
});

afterAll(async () => {
  await orm.close(true);
});

test("basic CRUD example", async () => {
  const createUser = new User();
  createUser.email = "foo";
  createUser.name = "test";
  await orm.em.getRepository(User).upsert(createUser);
  await orm.em.flush();
  orm.em.clear();

  const user = await orm.em.findOneOrFail(User, { email: "foo" });
  expect(user.id).toBe(expect.any(String));

  user.name = "Bar";
  orm.em.remove(user);
  await orm.em.flush();

  const count = await orm.em.count(User, { email: "foo" });
  expect(count).toBe(0);
});
