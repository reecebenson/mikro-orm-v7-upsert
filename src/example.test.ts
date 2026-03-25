import { MikroORM } from "@mikro-orm/sqlite";
import { defineEntity, p } from "@mikro-orm/core";
import { v4 } from "uuid";

const BaseSchema = defineEntity({
  name: "Base",
  abstract: true,
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
  },
});

const UserSchema = defineEntity({
  name: "User",
  extends: BaseSchema,
  properties: {
    email: p.string().unique().index(),
    name: p.string(),
  },
});

type AbstractCtor<T = {}> = abstract new (...args: any[]) => T;
type AnyCtor<T = {}> = new (...args: any[]) => T;

function WithBaseFields<TBase extends AbstractCtor>(
  Base: TBase,
): AnyCtor<InstanceType<TBase>>;
function WithBaseFields<TBase extends AnyCtor>(Base: TBase) {
  return class extends Base {
    id = "foobarbaz";
    createdAt = new Date();
    updatedAt = new Date();
  };
}

export class User extends WithBaseFields(UserSchema.class) {
  name = "";
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
  expect(user.id).toEqual(expect.any(String));

  user.name = "Bar";
  orm.em.remove(user);
  await orm.em.flush();

  const count = await orm.em.count(User, { email: "foo" });
  expect(count).toBe(0);
});
