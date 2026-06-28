import { readFileSync } from "fs";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

let _sdk: any = null;
function getSDK() {
  if (!_sdk) _sdk = require("casper-js-sdk");
  return _sdk;
}

const RPC = process.env.CASPER_RPC ?? "https://node.testnet.casper.network/rpc";
const CHAIN = process.env.CASPER_CHAIN ?? "casper-test";
const CONTRACT_HASH = process.env.CONTRACT_HASH ?? "";
const SECRET_KEY_PATH = process.env.CASPER_SECRET_KEY_PATH ?? "";

export async function getComicCount(): Promise<number> {
  try {
    const { CasperClient } = getSDK();
    const client = new CasperClient(RPC);
    const stateRootHash = await client.nodeClient.getStateRootHash();
    const contractHash = CONTRACT_HASH.replace("contract-", "");
    const result = await client.nodeClient.getBlockState(
      stateRootHash, `hash-${contractHash}`, ["comic_count"]
    );
    return Number((result as any)?.CLValue?.parsed ?? 0);
  } catch { return 0; }
}

async function callEntryPoint(entryPoint: string, args: Record<string, any>): Promise<string> {
  const { CasperClient, DeployUtil, Keys, CLValueBuilder, RuntimeArgs, CLTypeBuilder } = getSDK();
  const keyPem = readFileSync(SECRET_KEY_PATH, "utf-8");
  const keypair = Keys.Ed25519.parsePrivateKey(Keys.Ed25519.readBase64WithPEM(keyPem));
  const pubKey = Keys.Ed25519.privateToPublicKey(keypair);
  const accountKey = Keys.Ed25519.parseKeyPair(pubKey, keypair);
  const client = new CasperClient(RPC);

  const deployParams = new DeployUtil.DeployParams(accountKey.publicKey, CHAIN, 1, 1_800_000);
  const contractHashBytes = Uint8Array.from(Buffer.from(CONTRACT_HASH.replace("contract-", ""), "hex"));

  const runtimeArgs = RuntimeArgs.fromMap(args);
  const session = DeployUtil.ExecutableDeployItem.newStoredContractByHash(
    contractHashBytes, entryPoint, runtimeArgs
  );
  const payment = DeployUtil.standardPayment(10_000_000_000);
  const deploy = DeployUtil.makeDeploy(deployParams, session, payment);
  const signedDeploy = DeployUtil.signDeploy(deploy, accountKey);
  return await client.putDeploy(signedDeploy);
}

export async function addComic(
  title: string,
  issue: string,
  gradeX10: number,
  isKey: boolean,
  valueCents: number
): Promise<string> {
  const { CLValueBuilder } = getSDK();
  return callEntryPoint("add_comic", {
    title: CLValueBuilder.string(title),
    issue: CLValueBuilder.string(issue),
    grade_x10: CLValueBuilder.u32(gradeX10),
    is_key: CLValueBuilder.bool(isKey),
    value_cents: CLValueBuilder.u64(valueCents),
  });
}

export async function getComicById(id: number): Promise<any> {
  try {
    const { CasperClient } = getSDK();
    const client = new CasperClient(RPC);
    const stateRootHash = await client.nodeClient.getStateRootHash();
    const contractHash = CONTRACT_HASH.replace("contract-", "");
    const title = await client.nodeClient.getBlockState(stateRootHash, `hash-${contractHash}`, [`comic_titles_${id}`]);
    return { id, title: (title as any)?.CLValue?.parsed };
  } catch { return null; }
}
