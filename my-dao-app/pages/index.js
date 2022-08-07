import { Contract, providers } from "ethers";
import { formatEther } from "ethers/lib/utils";
import Head from "next/head";
import { useEffect, useRef, useState } from "react";
import Web3Modal from "web3modal";
import {
  MYNFT_DAO_CONTRACT_ADDRESS,
  MYNFT_CONTRACT_ADDRESS,
  MYNFT_DAO_ABI,
  MYNFT_ABI,
} from "../constants";
import styles from "../styles/Home.module.css";


export default function Home() {
  const [treasuryBalance, setTreasuryBalance] = useState("0"); // ETH balance of the DAO contract
  const [numProposals, setNumProposals] = useState("0"); // Number of proposals created in the DAO
  const [proposals, setProposals] = useState([]); // array of proposals in the DAO
  const [nftBalance, setNftBalance] = useState(0); // user's MyNFT NFT balance
  const [fakeNftTokenId, setFakeNftTokenId] = useState(""); // fake NFT token id to purchase (used when creating a proposal)
  const [selectedTab, setSelectedTab] = useState(""); // create proposal or view proposals
  const [loading, setLoading] = useState(false);
  const [walletConnected, setWalletConnected] = useState(false);// user connected the wallet or not
  const web3ModalRef = useRef();


  const connectWallet = async () => {
    try {
      await getProviderOrSigner();
      setWalletConnected(true);
    } catch (error) {
      console.error(error);
    }
  };

  const getProviderOrSigner = async (needSigner = false) => {
    try{
      // to get access to provider/signer from metamask
      const provider = await web3ModalRef.current.connect(); 
      const web3Provider = new providers.Web3Provider(provider);


      // check the network and ask users to switch if not in correct network (goerli here)
      const { chainId }= await web3Provider.getNetwork();
      if(chainId!==5){
          window.alert("Change the network to Goerli");
          throw new Error("Change the network to Goerli");
      }

      // if signer is needed return signer
      if(needSigner){
        const signer = web3Provider.getSigner();
        return signer;
      }

      return web3Provider;

    }catch(err){
      console.log(error)
    }
  };

  const getDaoContractInstance = (providerOrSigner) => {
    // function which returns the DAO contract instance given a provider or signer
    return new Contract(
      MYNFT_DAO_CONTRACT_ADDRESS,
      MYNFT_DAO_ABI,
      providerOrSigner
    );
  };

  const getMyNFTContractInstance = (providerOrSigner) => {
    // function which returns the NFT contract instance given a provider or signer
    return new Contract(
      MYNFT_CONTRACT_ADDRESS,
      MYNFT_ABI,
      providerOrSigner
    );
  };

  const getDAOTreasuryBalance = async () => {
    // gets ETH balance of treasury contract
    try {
      const provider = await getProviderOrSigner();
      const balance = await provider.getBalance(MYNFT_DAO_CONTRACT_ADDRESS);
      setTreasuryBalance(balance.toString());
    } catch (error) {
      console.error(error);
    }
  };

  const getNumProposalsInDAO = async () => {
    // reads the number of proposals in the DAO contract
    try {
      const provider = await getProviderOrSigner();
      const contract = getDaoContractInstance(provider);
      const daoNumProposals = await contract.numProposals();
      setNumProposals(daoNumProposals.toString());
    } catch (error) {
      console.error(error);
    }
  };

  const getUserNFTBalance = async () => {
    // get the user's MyNFT balance
    try {
      const signer = await getProviderOrSigner(true);
      const nftContract = getMyNFTContractInstance(signer);
      const balance = await nftContract.balanceOf(signer.getAddress());
      setNftBalance(parseInt(balance.toString()));
    } catch (error) {
      console.error(error);
    }
  };

  const createProposal = async () => {
    // calls the 'createProposal' function in the DAO contract using the tokenId fakeNftTokenId
    try {
      const signer = await getProviderOrSigner(true);
      const daoContract = getDaoContractInstance(signer);
      const txn = await daoContract.createProposal(fakeNftTokenId);
      setLoading(true);
      await txn.wait();
      await getNumProposalsInDAO();
      setLoading(false);
    } catch (error) {
      console.error(error);
      window.alert("NFT not for sale");
    }
  };

  const fetchProposalById = async (id) => {
    // to fetch and parse the proposal data from the DAO contract given the proposal id
    // Converts the data into javascript object
    try {
      const provider = await getProviderOrSigner();
      const daoContract = getDaoContractInstance(provider);
      const proposal = await daoContract.proposals(id);
      const parsedProposal = {
        proposalId: id,
        nftTokenId: proposal.nftTokenId.toString(),
        deadline: new Date(parseInt(proposal.deadline.toString()) * 1000),
        yesVotes: proposal.yesVotes.toString(),
        noVotes: proposal.noVotes.toString(),
        executed: proposal.executed,
      };

      return parsedProposal;

    } catch (error) {
      console.error(error);
    }
  };

  const fetchAllProposals = async () => {
    // fetches all the proposals in the DAO contract and parses the data into javascript object 
    // and stores in the proposals array
    try {
      const proposals = [];
      for (let i = 0; i < numProposals; i++) {
        const proposal = await fetchProposalById(i);
        proposals.push(proposal);
      }

      setProposals(proposals);
      
      return proposals;

    } catch (error) {
      console.error(error);
    }
  };

  const voteOnProposal = async (proposalId, _vote) => {
    // calls the 'voteOnProposal' function in the DAO contract using the proposalId and vote (yes or no)
    try {
      const signer = await getProviderOrSigner(true);
      const daoContract = getDaoContractInstance(signer);

      let vote = _vote === "YES" ? 0 : 1;
      const txn = await daoContract.voteOnProposal(proposalId, vote);

      setLoading(true);
      await txn.wait();
      setLoading(false);


      await fetchAllProposals();
    } catch (error) {
      console.error(error);
      window.alert(error.message);
    }
  };

  const executeProposal = async (proposalId) => {
    // calls the 'executeProposal' function in the DAO contract using the proposalId passed as argument
    try {
      const signer = await getProviderOrSigner(true);
      const daoContract = getDaoContractInstance(signer);
      const txn = await daoContract.executeProposal(proposalId);

      setLoading(true);
      await txn.wait();
      setLoading(false);

      await fetchAllProposals();
    } catch (error) {
      console.error(error);
      window.alert(error.data.message);
    }
  };

  const onPageLoad = async () => {
    await connectWallet();
    await getDAOTreasuryBalance();
    await getUserNFTBalance();
    await getNumProposalsInDAO();
  }

  useEffect(() => {
    if (!walletConnected) {
      web3ModalRef.current = new Web3Modal({
        network: "goerli",
        providerOptions: {},
        disableInjectedProvider: false,
      });
      onPageLoad()
    }
  }, [walletConnected]);

  useEffect(() => {
    // runs every time the value of selectTab changes
    // refetches all proposals when user switches to "view proposals" tab
    if (selectedTab === "View Proposals") {
      fetchAllProposals();
    }
  }, [selectedTab]);
  
  function renderTabs() {
    if (selectedTab === "Create Proposal") {
      return renderCreateProposalTab();
    } else if (selectedTab === "View Proposals") {
      return renderViewProposalsTab();
    }
    return null;
  }

  function renderCreateProposalTab() {
    // render create proposal tab
    if (loading) {
      
      return (
        <div className={styles.description}>
          Loading... Waiting for transaction...
        </div>
      );

    } else if (nftBalance === 0) {

      return (
        <div className={styles.description}>
          You do not own any MyNFT NFTs. 
          <br />
          <b>You cannot create or vote on proposals</b>
        </div>
      );

    } else {

      return (
        <div className={styles.container}>
          <label>Fake NFT Token ID to Purchase: </label>
          <input placeholder="0" type="number" onChange={(e) => setFakeNftTokenId(e.target.value)} />
          <button className={styles.button2} onClick={createProposal}>
            Create
          </button>
        </div>
      );
    }
  }

  function renderButtonsOnViewProposalTab(proposal) {
    if(proposal.deadline.getTime() > Date.now() && !proposal.executed ) {
      return (<div className={styles.flex}>
                <button className={styles.button2} onClick={() => voteOnProposal(proposal.proposalId, "YES")}>
                  Vote YES
                </button>
                <button className={styles.button2} onClick={() => voteOnProposal(proposal.proposalId, "NO")}>
                  Vote NO
                </button>
              </div>
      );
    }else if(proposal.deadline.getTime() < Date.now() && !proposal.executed){
      return (
      <div className={styles.flex}>
        <button className={styles.button2} onClick={() => executeProposal(proposal.proposalId)}>
          Execute Proposal{" "}
          {proposal.yesVotes > proposal.noVotes ? "(YES)" : "(NO)"}
        </button>
      </div>
      )
    }else{
      return (
        <div className={styles.description}>Proposal Executed</div>
      )
    }
  }

  function renderViewProposalsTab() {
    // render view proposals tab
    if (loading) {

      return (
        <div className={styles.description}>
          Loading... Waiting for transaction...
        </div>
      );

    } else if (proposals.length === 0) {

      return (
        <div className={styles.description}>
          No proposals have been created in the DAO.
        </div>
      );

    } else {
      return (
        <div>
          {proposals.map((p, index) => (
            <div key={index} className={styles.proposalCard}>
              <p>Proposal ID: {p.proposalId}</p>
              <p>Fake NFT to Purchase: {p.nftTokenId}</p>
              <p>Deadline: {p.deadline.toLocaleString()}</p>
              <p>Yes Votes: {p.yesVotes}</p>
              <p>No Votes: {p.noVotes}</p>
              <p>Executed?: {p.executed.toString()}</p>

              {renderButtonsOnViewProposalTab(p)}

            </div>
          ))}
        </div>
      );
    }
  }

  return (
    <div>
      <Head>
        <title>MyNft DAO</title>
        <meta name="description" content="MyNft DAO" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className={styles.main}>
        <div>
          <h1 className={styles.title}>Welcome to MyNFT!</h1>
          <div className={styles.description}>Welcome to the DAO!</div>
          <div className={styles.description}>
            Your MyNFT NFT Balance: {nftBalance}
            <br />
            Treasury Balance: {formatEther(treasuryBalance)} ETH
            <br />
            Total Number of Proposals: {numProposals}
          </div>
          <div className={styles.flex}>
            <button className={styles.button} onClick={() => setSelectedTab("Create Proposal")} >
              Create Proposal
            </button>
            <button className={styles.button} onClick={() => setSelectedTab("View Proposals")} >
              View Proposals
            </button>
          </div>
          {renderTabs()}
        </div>
        <div>
          <img className={styles.image} src="0.svg" />
        </div>
      </div>

      <footer className={styles.footer}>
        MyNFT 2022
      </footer>
    </div>
  );
}
