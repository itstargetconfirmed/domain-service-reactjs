import React, { useEffect, useState } from 'react';

import twitterLogo from './assets/twitter-logo.svg';
import polygonLogo from './assets/polygonlogo.png';
import ethLogo from './assets/ethlogo.png';


import { ethers } from 'ethers';

import contractAbi from './utils/abi-domains.json';
import { networks } from './utils/networks';

import './styles/App.css';

import Swal from 'sweetalert2'
import withReactContent from 'sweetalert2-react-content'

// Constants
const TWITTER_HANDLE = 'targetconfirmd';
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;

const CONTRACT_ADDRESS = '0x56d04eC782E8F324f6515868c1065A5efd70AB16';

const _Swal = withReactContent(Swal)

const App = () => {

	const tld = '.potato'; 

	const [editing, setEditing] = useState(false);

	const [network, setNetwork] = useState('');
	const [currentAccount, setCurrentAccount] = useState('');

	const [domain, setDomain] = useState('');
	const [record, setRecord] = useState('');
	const [mints, setMints] = useState([]);

	const connectWallet = async () => { 
		try { 
			const { ethereum } = window; 
			
			// refactor later.
			if (!ethereum) {
				console.log(`You do not have MetaMask.`);
				
				await _Swal.fire({
					title: `MetaMask Not Found`, 
					text: `You do not have MetaMask installed.`,
					icon: 'error'
				});
				return;
			}
			
			const accounts = await ethereum.request({method: 'eth_requestAccounts'});
			console.log(`An account was authorized - ${accounts[0]}.`);
			setCurrentAccount(accounts[0]);

		} catch(error) {
			console.log(error);

			await _Swal.fire({
				title: `App Error`, 
				text: error.message,
				icon: 'error'
			});
		}
	};

	const checkIfWalletIsConnected = async () => { 
		const { ethereum } = window; 

		// refactor later.
		if (!ethereum) {
			console.log(`You do not have MetaMask.`);
		} else { 
			console.log(`You have MetaMask - ${ethereum}.`);
		}

		const accounts = await ethereum.request({method: 'eth_accounts'});

		if (accounts.length !== 0){
			const account = accounts[0];
			console.log(`An authorized account was found - ${account}.`);
			setCurrentAccount(account);
		} else { 
			console.log(`No authorized account was found.`);
		}
		
		// get the current chain the user is on. 
		const chainId = await ethereum.request({method: 'eth_chainId'});
		setNetwork(networks[chainId]);

		ethereum.on('chainChanged', handleChainChanged);

		function handleChainChanged(_chainId) { 
			window.location.reload();
		}

	};

	const renderNotConnectedContainer = () => { 
		return (
			<div className="connect-wallet-container">
				<img className="potato-gif" src="https://media2.giphy.com/media/khl6RE8XNiwxstKNzE/giphy.gif" alt="Ninja gif" />
				<button onClick={connectWallet} className="cta-button connect-wallet-button">
					Connect Wallet
				</button>
			</div>
		);
	};

	const renderInputForm = () => { 

		if (network !== 'Polygon Mumbai Testnet') {
			return (
				<div className="connect-wallet-container">
					<p>Please connect to the Polygon Mumbai Testnet</p>
					<button className='cta-button mint-button' onClick={switchNetwork}>Click here to switch</button>
				</div>
			);
		}

		return (
			<div className="form-container">
				<div className="first-row">
					<input
						type="text"
						value={domain}
						placeholder='domain'
						onChange={e => setDomain(e.target.value)}
					/>
					<p className='tld'> {tld} </p>
				</div>

				<input
					type="text"
					value={record}
					placeholder='record value'
					onChange={e => setRecord(e.target.value)}
				/>

				{editing ? (
				<div className="button-container">
  
					<button className='cta-button mint-button' disabled={null} onClick={updateDomain}>
						Set data
					</button>  
					<button className='cta-button mint-button' onClick={() => {setEditing(false)}}>
						Cancel
					</button>  
				</div>
				): (
					<button className='cta-button mint-button' disabled={null} onClick={mintDomain}>
						Mint
					</button>
				)}


			</div>
		);
	};

	const mintDomain = async () => { 

		
		const domainLength = domain.length; 
		if (!domain || domainLength < 1 || domainLength > 10) { 
			await _Swal.fire({
				title: `Domain Validation Error`, 
				text: `Your domain length must be between 1 and 10 characters inclusive.`,
				icon: 'error'
			});
			return;
		} 

		let price = 0.1;

		// set domain price based on length.
		if (domainLength === 1){
			price = 0.4;
		} else if (domainLength === 2){
			price = 0.3; 
		} else if (domainLength === 3) {
			price = 0.2;
		}
		
		// parse ether expects string.
		price = String(price);
		
		console.log(`Minting ${domain} for a price of ${price} MATIC.`);

		try{
			const { ethereum } = window; 
			if (ethereum) {
				const provider = new ethers.providers.Web3Provider(ethereum);
				const signer = provider.getSigner(); 
				const contract = new ethers.Contract(CONTRACT_ADDRESS, contractAbi.abi, signer);
				
				console.log(`Loading wallet pop up to pay gas fee.`);
				
				// register domain and wait for success.
				let tx = await contract.register(domain, {value: ethers.utils.parseEther(price)});
				const receipt = await tx.wait(); 
			

				if (receipt.status === 1) {
					console.log(`The domain ${domain} has been registered - https://mumbai.polygonscan.com/tx/${tx.hash}.`);

					await _Swal.fire({
						title: `Domain Registered`, 
						text: `Your domain ${domain}.potato has been registered. We will now attempt to register the record.`,
						icon: 'success'
					});

					tx = await contract.setRecord(domain, record);
					await tx.wait(); 

					console.log(`The record ${record} for domain ${domain} is set - https://mumbai.polygonscan.com/tx/${tx.hash}.`);
					
					await _Swal.fire({
						title: `Domain Record Set.`, 
						text: `The record ${record} for domain ${domain}.potato was set.`,
						icon: 'success'
					});

					setTimeout(() => {
						fetchMints();
					}, 2000);

					setRecord('');
					setDomain('');
				}
				else { 
					await _Swal.fire({
						title: `Domain Registraton Error`, 
						text: `We could not register the domain ${domain}.potato.`,
						icon: 'error'
					});
					return;
				}
			}
		} catch(error) {
			console.log(error);
			await _Swal.fire({
				title: `App Error`, 
				text: error.message,
				icon: 'error'
			});
		}
	};


	const updateDomain = async() => { 
		if (!record || !domain) {
			return; 
		}

		console.log(`You are updating domain ${domain} with record ${record}.`);

		try{ 
			const { ethereum } = window; 
			if (ethereum) {
				const provider = new ethers.providers.Web3Provider(ethereum);
				const signer = provider.getSigner(); 
				const contract = new ethers.Contract(CONTRACT_ADDRESS, contractAbi.abi, signer);

				let tx = await contract.setRecord(domain, record);
				await tx.wait(); 
				console.log(`You set the record for ${domain} to ${record} - https://mumbai.polygonscan.com/tx/${tx.hash}.`);
				
				await _Swal.fire({
					title: `Domain Record Updated.`, 
					text: `The record ${record} for domain ${domain}.potato was updated.`,
					icon: 'success'
				});

				fetchMints(); 
				setRecord('');
				setDomain('');
			}
		} catch(error) {
			console.log(error);
			await _Swal.fire({
				title: `App Error`, 
				text: error.message,
				icon: 'error'
			});

		}

	};

	const fetchMints = async() => { 
		try {
			const { ethereum } = window; 
			if (ethereum) {
				const provider = new ethers.providers.Web3Provider(ethereum);
				const signer = provider.getSigner(); 
				const contract = new ethers.Contract(CONTRACT_ADDRESS, contractAbi.abi, signer);

				const names = await contract.getAllNames(); 

				let mintRecords = await Promise.all(names.map(async(name) => { 
					const mintRecord = await contract.records(name);
					const owner = await contract.domains(name);
					return { 
						id: names.indexOf(name), 
						name: name, 
						record: mintRecord, 
						owner: owner
					};
				}));

				console.log(`Fetched domains and their records.`);
				console.log(mintRecords);
				setMints(mintRecords);
			}
		} catch(error) {
			console.log(error);
		}
	};

	const switchNetwork = async () => { 
		const { ethereum } = window; 

		if (ethereum) {
			try {
				await ethereum.request({
					method: 'wallet_switchEthereumChain',
					params: [{chainId: '0x13881'}]
				});
			} catch (error) {
				
				console.log(error);
	
				if (error.code === 4902) {
					try {
						await ethereum.request({
							method: 'wallet_addEthereumChain',
							params: [
								{	
									chainId: '0x13881',
									chainName: 'Polygon Mumbai Testnet',
									rpcUrls: ['https://rpc-mumbai.maticvigil.com/'],
									nativeCurrency: {
											name: "Mumbai Matic",
											symbol: "MATIC",
											decimals: 18
									},
									blockExplorerUrls: ["https://mumbai.polygonscan.com/"]
								}							
							]
						});
					} catch (error) {
						console.log(error);
					}
				}
	
			}
		} else { 
			console.log(`You do not have MetaMask.`);
		}

 	}

	
	const renderMints = () => {
		if (currentAccount && mints.length > 0) {
			return (
				<div className="mint-container">
					<p className="subtitle">Minted Domains</p>
					<div className="mint-list">
						{ mints.map((mint, index) => {
							return (
								<div className="mint-item" key={index}>
									<div className='mint-row'>
										<a className="link" href={`https://testnets.opensea.io/assets/mumbai/${CONTRACT_ADDRESS}/${mint.id}`} target="_blank" rel="noopener noreferrer">
											<p className="underlined">{' '}{mint.name}{tld}{' '}</p>
										</a>
										
										{ mint.owner.toLowerCase() === currentAccount.toLowerCase() ?
											<button className="edit-button" onClick={() => editRecord(mint.name)}>
												<img className="edit-icon" src="https://img.icons8.com/metro/26/000000/pencil.png" alt="Edit button" />
											</button>
											:
											null
										}
									</div>
						<p> {mint.record} </p>
					</div>)
					})}
				</div>
			</div>);
		}
	};


	const editRecord = (name) => {
		setEditing(true);
		setDomain(name);
	}

	useEffect(() => {
		checkIfWalletIsConnected();
	}, []);

	useEffect(() => { 
		if (network === 'Polygon Mumbai Testnet') {
			fetchMints();
		}
	}, [currentAccount, network]);

	return (
		<div className="App">
			<div className="container">

				<div className="header-container">
					<header>
						<div className="left">
							<p className="title">🥔 Potato Name Service</p>
							<p className="subtitle">Get Your Potato Domain on the Blockchain</p>
						</div>
						<div className="right">
							<img alt="Network logo" className="logo" src={ network.includes("Polygon") ? polygonLogo : ethLogo} />
							{ currentAccount ? <p> Wallet: {currentAccount.slice(0, 6)}...{currentAccount.slice(-4)} </p> : <p> Not connected </p> }
						</div>
					</header>
				</div>

				{!currentAccount && renderNotConnectedContainer()}
				{currentAccount && renderInputForm()}
				{mints && renderMints()}

				<div className="footer-container">
							<img alt="Twitter Logo" className="twitter-logo" src={twitterLogo} />
							<a
								className="footer-text"
								href={TWITTER_LINK}
								target="_blank"
								rel="noreferrer"
							>{`built by @${TWITTER_HANDLE}`}</a>
				</div>

			</div>
		</div>
		);
}

export default App;
