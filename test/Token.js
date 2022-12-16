const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");

async function getAutofloorPrice(tokenPair)
{
  token_sell_quote = await tokenPair.getSellNFTQuote(1)
  return ethers.utils.formatEther(token_sell_quote[3])
}

async function getMintPrice(nftPair)
{
  nft_buy_quote = await nftPair.getBuyNFTQuote(1)
  return ethers.utils.formatEther(nft_buy_quote[3])
}

async function printPairState(tokenPair, nftPair)
{
  console.log("Prices")
  console.log("======")
  console.log("Mint:      " + await getMintPrice(nftPair) + " ETH")
  console.log("Autofloor: " + await getAutofloorPrice(tokenPair) + " ETH")
  console.log("")
}

async function printETHBalances(myNFT, user, tokenPair)
{
  console.log("ETH Balances")
  console.log("============")
  console.log("NFT Contract: " + ethers.utils.formatEther(await ethers.provider.getBalance(myNFT.address)))
  console.log("User:        " + ethers.utils.formatEther(await ethers.provider.getBalance(user.address)))
  console.log("Token Pair:   " + ethers.utils.formatEther(await ethers.provider.getBalance(tokenPair.address)))
  console.log("")
}

async function printNFTBalances(user, myNFT)
{
  console.log("NFT Balances")
  console.log("============")
  console.log("User:        " + await myNFT.balanceOf(user.address))
  console.log("NFT Contract: " + await myNFT.balanceOf(myNFT.address))
  console.log("NFT Pair:     " + await myNFT.balanceOf(myNFT.getNFTPairAddress()))
  console.log("Token Pair:   " + await myNFT.balanceOf(myNFT.getTokenPairAddress()))
  console.log("")
}

async function buyNFT(etherAmount, user)
{
  //console.log("We buy an NFT for " + etherAmount + " ETH ")
  //console.log("")
  await router.connect(user).swapETHForAnyNFTs(
    [
      [
        await myNFT.getNFTPairAddress(),
        1
      ]
    ],
    user.address, // Excess eth recipient
    user.address, // NFT recipient
    deadline,
    {value: ethers.utils.parseEther(etherAmount)}
  )
}

async function sellNFT(holder, etherAmount)
{
  //console.log("We sell an NFT for " + etherAmount + " ETH")
  //console.log("")

  var tokenId = myNFT.tokenOfOwnerByIndex(holder.address, 0)
  await myNFT.connect(holder).approve(router.address, tokenId)
  await router.connect(holder).swapNFTsForToken(
    [
      [
        await myNFT.getTokenPairAddress(),
        [tokenId]
      ]
    ],
    ethers.utils.parseEther(etherAmount),
    holder.address,
    deadline
  )
}

describe("Sudoswap Token", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshopt in every test.
  async function deployAndInitContractsFixiture() {
    const blockNumBefore = await ethers.provider.getBlockNumber();
    const blockBefore = await ethers.provider.getBlock(blockNumBefore);
    deadline = blockBefore.timestamp + 999999;
  
    [deployer, user1, user2, user3, user4, user5] = await ethers.getSigners();
    const MyNFT = await hre.ethers.getContractFactory("MyNFT");
    const LSSVMRouter = await hre.ethers.getContractFactory("LSSVMRouter");
    const LSSVMPair = await hre.ethers.getContractFactory("ILSSVMPair");
    router = await LSSVMRouter.attach("0x2B2e8cDA09bBA9660dCA5cB6233787738Ad68329" /* mainnet router */);
  
    myNFT = await MyNFT.deploy();
    await myNFT.deployed();
  
    // Init stuff
    await myNFT.initializeSale("0xb16c1342E617A5B6E4b631EB114483FDB289c0A4" /* mainnet factory */)
    nftPair = await LSSVMPair.attach(await myNFT.getNFTPairAddress())
    tokenPair = await LSSVMPair.attach(await myNFT.getTokenPairAddress())

    return { deadline, myNFT, nftPair, tokenPair, user1, user2 };
  }

  describe("Deployment", function () {
    it("Should be able to buy", async function () {
      const { deadline, myNFT, nftPair, tokenPair, user1, user2 } = await loadFixture(deployAndInitContractsFixiture);
      
      //await printPairState(tokenPair, nftPair)
      //await printETHBalances(myNFT, user1, tokenPair)
      //console.log("Pair Address" + tokenPair.address)
      //console.log("Pair Address" + nftPair.address)
      for(i=0;i<15;i++)
      {
        await buyNFT(await getMintPrice(nftPair), user1)
        //await printETHBalances(myNFT, user1, tokenPair)
      }
      //await printNFTBalances(user1, myNFT)
      //await printPairState(tokenPair, nftPair)
      //await printETHBalances(myNFT, user1, tokenPair)

      expect(await ethers.provider.getBalance(myNFT.address))
        .to.equal
        (ethers.utils.parseEther("0.3"));
      expect(await getMintPrice(nftPair))
        .to.equal
        ("0.0402");
      expect(await getAutofloorPrice(tokenPair))
        .to.equal
        ("0.0199");
      expect(await myNFT.balanceOf(myNFT.getNFTPairAddress()))
        .to.equal
        (10);
      expect(await myNFT.balanceOf(user1.address))
        .to.equal
        (15);
      expect(await myNFT.balanceOf(myNFT.autoFloorNFTReciever()))
        .to.equal
        (0);
    });

    it("Should be able to buy and sell to autofloor", async function () {
      const { deadline, myNFT, nftPair, tokenPair, user1, user2 } = await loadFixture(deployAndInitContractsFixiture);
      await buyNFT(await getMintPrice(nftPair), user1)
      await sellNFT(user1, await getAutofloorPrice(tokenPair))
  
      //await printNFTBalances(user1, myNFT)
      //await printPairState(tokenPair, nftPair)
      //await printETHBalances(myNFT, user1, tokenPair)

      expect(await ethers.provider.getBalance(myNFT.address))
        .to.equal
        (ethers.utils.parseEther("0.02"));
      expect(await getMintPrice(nftPair))
        .to.equal
        ("0.0402");
      expect(await getAutofloorPrice(tokenPair))
        .to.equal
        ("0.0199");
      expect(await myNFT.balanceOf(myNFT.getNFTPairAddress()))
        .to.equal
        (10);
      expect(await myNFT.balanceOf(user1.address))
        .to.equal
        (0);
      expect(await myNFT.balanceOf(myNFT.autoFloorNFTReciever()))
        .to.equal
        (1);
    });
  });
});
